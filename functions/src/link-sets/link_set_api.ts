import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {getGffft, gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, ref, update, value} from "typesaurus"
import * as Joi from "@hapi/joi"
import multer from "multer"
import {linkSetCollection, linkSetItemsCollection, hydrateLinkSetItem, getLink, linksCollection} from "./link_set_data"
import {Link, LinkSetItem, UpdateLink} from "./link_set_models"
import {usersCollection} from "../users/user_data"
import {linkSetItemToJson, linkToJson} from "./link_set_interfaces"
import urlParser from "url-parse"
import {unfurl} from "unfurl.js"

import Libhoney from "libhoney"
import axios from "axios"

const hny = new Libhoney({
  writeKey: "160965349838cd907f5532a79ee04410",
  dataset: "gffft",
})


// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

const multerStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "/tmp/")
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `${file.fieldname}-${uniqueSuffix}`)
  },
})

const upload = multer({storage: multerStorage})

const createItemParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  lid: Joi.string().required(),
  url: Joi.string().optional(),
  description: Joi.string().optional(),
})
export interface CreateItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Fields]: {
    uid: string
    gid: string
    lid: string
    url: string
    description?: string
  }
}

router.post(
  "/",
  upload.any(),
  validator.fields(createItemParams),
  requiredAuthentication,
  async (req: ValidatedRequest<CreateItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid: string = req.body.uid
    let gid: string = req.body.gid
    const lid: string = req.body.lid
    const url = req.body.url
    const description = req.body.description

    if (uid == "me") {
      uid = iamUser.id
    }

    // make sure the gffft exists
    const gffft = await getGffft(uid, gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    console.log(`uid:${uid} gid:${gid} bid:${lid} url: ${url} description: ${description}`)

    // const gffft = await getGffft(uid, gid)
    // const board = await getBoard(uid, gid, bid)

    const gffftMembers = gffftsMembersCollection([uid, gid])

    // is this poster a member of the gffft?
    const posterUid = res.locals.iamUser.id
    const posterRef = ref(usersCollection, posterUid)

    const membershipDoc = await get(ref(gffftMembers, posterUid))
    if (!membershipDoc) {
      console.log("poster is not a member of this board")
      res.sendStatus(403)
      return
    }

    const membership = membershipDoc.data
    if (membership.type == TYPE_PENDING || membership.type == TYPE_REJECTED) {
      console.log("poster is not an approved member of this board")
      res.sendStatus(403)
      return
    }

    console.log(`creating linkSet item: uid:${uid} gid:${gid} lid:${lid} description: ${description}`)

    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const linkSets = linkSetCollection(ref(gfffts, gid))
    const linkSetRef = ref(linkSets, lid)
    const linkSetItems = linkSetItemsCollection(linkSetRef)
    const item = {
      author: posterRef,
      createdAt: new Date(),
      url: url,
      description: description,
    } as LinkSetItem
    const linkSetItemRef = await add(linkSetItems, item)

    item.id = linkSetItemRef.id

    const hgi = await hydrateLinkSetItem(item)
    if (hgi == null) {
      console.warn(`Hydrated linkSet item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    res.json(linkSetItemToJson(hgi))
  }
)

export interface LinkRequest extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    url: string
  };
}
const linkGetQueryParams = Joi.object({
  url: Joi.string().required(),
})
router.get(
  "/link",
  upload.any(),
  validator.query(linkGetQueryParams),
  async (req: ValidatedRequest<LinkRequest>, res: Response) => {
    const url = decodeURIComponent(req.query.url)
    const parsedUrl = urlParser(url)
    const event = hny.newEvent()
    event.addField("name", "link")
    event.addField("action", "get")
    event.addField("domain", parsedUrl.hostname)
    event.addField("url", url)
    event.send()

    let link = await getLink(url)
    if (link == null) {
      const response = await axios
        .get(url)
        .catch((error) => {
          console.info(`error fetching url: ${url}. ${error}`)
          return null
        })

      if (response == null) {
        res.status(500).send("unable to fetch url")
        return
      }

      const unfurled = await unfurl(url)
      const description = unfurled?.description ?? unfurled.open_graph?.description

      link = {
        domain: parsedUrl.hostname,
        url: url,
        title: unfurled.title,
        description: description,
        metadata: JSON.stringify(unfurled),
        responseCode: response.status,
        body: (typeof response.data == "string") ? response.data : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        queryCount: 1,
        clickCount: 0,
        saveCount: 0,
      } as Link

      const ref = await add(linksCollection, link)
      link.id = ref.id
    } else {
      if (new Date().getTime() - link.updatedAt.getTime() > (1000 * 60 * 60 * 24)) {
        const response = await axios.get(url)
        const unfurled = await unfurl(url)
        const description = unfurled.description ?? unfurled.open_graph.description

        link.domain = parsedUrl.hostname
        link.title = unfurled.title
        link.description = description
        link.metadata = JSON.stringify(unfurled)
        link.responseCode = response.status
        link.body = (typeof response.data == "string") ? response.data : undefined
        link.updatedAt= new Date(),

        await update<UpdateLink>(linksCollection, link.id, {
          ...link,
          queryCount: value("increment", 1),
        })
      } else {
        await update<UpdateLink>(linksCollection, link.id, {
          queryCount: value("increment", 1),
        })
      }
    }
    res.json(linkToJson(link))
  }
)


export default router
