import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {getGffft, gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, ref} from "typesaurus"
import * as Joi from "@hapi/joi"
import multer from "multer"
import {linkSetCollection, linkSetItemsCollection, hydrateLinkSetItem} from "./link_set_data"
import {LinkSetItem} from "./link_set_models"
import {usersCollection} from "../users/user_data"
import {linkSetItemToJson} from "./link_set_interfaces"

import Libhoney from "libhoney"
import {Http} from "../common/http"
import axios, {AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse} from "axios"

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
  validator.params(linkGetQueryParams),
  async (req: ValidatedRequest<LinkRequest>, res: Response) => {
    const url = req.params.url
    const event = hny.newEvent()
    event.addField("name", "link")
    event.addField("action", "get")
    event.addField("url", url)
    event.send()

    const client = axios.create()

    const response = await client.get(url)
  }
)


export default router

