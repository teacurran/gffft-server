import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication} from "../accounts/auth"
import {getGffft, gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, ref, update, value} from "typesaurus"
import * as Joi from "joi"
import multer from "multer"
import {linkSetCollection, linkSetItemsCollection, hydrateLinkSetItem,
  linksCollection, getOrCreateLink} from "./link_set_data"
import {LinkSetItem, UpdateLink} from "./link_set_models"
import {usersCollection} from "../users/user_data"
import {linkSetItemToJson, linkToJson} from "./link_set_interfaces"
import urlParser from "url-parse"
import {getOrCreateDefaultBoard, threadPostsCollection, threadsCollection} from "../boards/board_data"
import {Thread} from "../boards/board_models"
import * as opentelemetry from "@opentelemetry/api"

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
    const parsedUrl = urlParser(url)

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

    const link = await getOrCreateLink(url)
    if (link == null) {
      res.status(500).send("unable to fetch url")
      return
    }

    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const linkSets = linkSetCollection(ref(gfffts, gid))
    const linkSetRef = ref(linkSets, lid)
    const linkSetItems = linkSetItemsCollection(linkSetRef)
    const linkRef = ref(linksCollection, link.id)

    const board = await getOrCreateDefaultBoard(uid, gid)
    const threads = threadsCollection([uid, gid, board.id])
    const thread = {
      subject: `🔗: ${link.title}`,
      firstPost: posterRef,
      latestPost: posterRef,
      createdAt: new Date(),
      updatedAt: new Date(),
      postCount: 0,
    } as Thread
    const threadRef = await add(threads, thread)

    const postsCollection = threadPostsCollection(threadRef)
    await add(postsCollection, {
      author: posterRef,
      body: description,
      createdAt: new Date(),
      linkRef: linkRef,
      deleted: false,
    })

    const item = {
      author: posterRef,
      createdAt: new Date(),
      linkRef: linkRef,
      threadRef: threadRef,
      url: url,
      description: description,
    } as LinkSetItem
    const linkSetItemRef = await add(linkSetItems, item)


    const activeSpan = opentelemetry.trace.getSpan(opentelemetry.context.active())
    activeSpan?.setAttribute("link.url", url)
    activeSpan?.setAttribute("link.domain", parsedUrl.hostname)

    item.id = linkSetItemRef.id
    const hgi = await hydrateLinkSetItem(uid, gid, item, link)
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

    const link = await getOrCreateLink(url)
    if (link == null) {
      res.status(500).send("unable to fetch url")
      return
    }
    await update<UpdateLink>(linksCollection, link.id, {
      queryCount: value("increment", 1),
    })

    res.json(linkToJson(link))
  }
)


export default router

