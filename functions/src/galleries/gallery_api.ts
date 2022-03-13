import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {getGffft, getGffftMembership, gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_OWNER, TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {get, ref, upset} from "typesaurus"
import * as Joi from "@hapi/joi"
import multer from "multer"
import {uuid} from "uuidv4"
import * as firebaseAdmin from "firebase-admin"
import {galleryCollection, galleryItemsCollection, hydrateGalleryItem} from "./gallery_data"
import {GalleryItem} from "./gallery_models"
import {usersCollection} from "../users/user_data"
import {galleryItemToJson} from "./gallery_interfaces"
import {itemOrNull} from "../common/data"

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
  mid: Joi.string().required(),
  description: Joi.string().optional(),
})
export interface CreateItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Fields]: {
    uid: string
    gid: string
    mid: string
    description?: string
  }
}


/**
 * @swagger
 * /galleries
 *   post:
 *     description: Post an item to the gallery
 *     consumes:
 *       - multipart/form-data:
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         schema:
 *     responses:
 *       204:
 */
router.post(
  "/",
  upload.any(),
  validator.fields(createItemParams),
  requiredAuthentication,
  async (req: ValidatedRequest<CreateItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid: string = req.body.uid
    let gid: string = req.body.gid
    const mid: string = req.body.mid
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

    console.log(`uid:${uid} gid:${gid} bid:${mid} description: ${description}`)

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

    console.log(`creating gallery item: uid:${uid} gid:${gid} bid:${mid} description: ${description}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = (req as any).files

    if (files == undefined) {
      console.log("files is empty")
      res.sendStatus(500)
      return
    }

    console.log(`files is: ${JSON.stringify(files)}`)

    const file = files[0]
    const type = file.originalname.split(".")[1]
    const itemId = uuid()

    const fileName = `${itemId}.${type}`

    const filePath = `users/${posterUid}/gfffts/${gid}/galleries/${mid}/items`
    const fullFilePath = `${filePath}/${fileName}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md: { [key: string]: any } = {
      metadata: {},
    }
    md.metadata.uid = uid
    md.metadata.gid = gid
    md.metadata.mid = mid
    md.metadata.iid = itemId

    await firebaseAdmin.storage()
      .bucket("gffft-auth.appspot.com").upload(file.path, {
        destination: fullFilePath,
        metadata: md,
      })

    // todo: figure out why this is no longer working, it was previously.
    // const itemsCollection = galleryItemsCollection([uid, gid, mid])

    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const galleries = galleryCollection(ref(gfffts, gid))
    const galleryRef = ref(galleries, mid)
    const galleryItems = galleryItemsCollection(galleryRef)
    const itemRef = ref(galleryItems, itemId)
    const item = {
      author: posterRef,
      createdAt: new Date(),
      fileName: fileName,
      filePath: filePath,
      description: description,
    } as GalleryItem
    await upset(itemRef, item)

    item.id = itemId

    const hgi = await hydrateGalleryItem(gid, uid, item)
    if (hgi == null) {
      console.warn(`Hydrated gallery item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    res.json(galleryItemToJson(iamUser, membership, hgi))
  }
)

const updateItemParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
  iid: Joi.string().required(),
  description: Joi.string().optional(),
})
export interface UpdateItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Fields]: {
    uid: string
    gid: string
    mid: string
    iid: string
    description?: string
  }
}

router.patch(
  "/",
  validator.fields(updateItemParams),
  requiredAuthentication,
  async (req: ValidatedRequest<UpdateItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid: string = req.body.uid
    let gid: string = req.body.gid
    const mid: string = req.body.mid
    const iid: string = req.body.iid
    const description = req.body.description

    if (uid == "me") {
      uid = iamUser.id
    }

    const gffftMembers = gffftsMembersCollection([uid, gid])
    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const galleries = galleryCollection(ref(gfffts, gid))
    const galleryRef = ref(galleries, mid)
    const galleryItems = galleryItemsCollection(galleryRef)
    const itemRef = ref(galleryItems, iid)

    // is this poster a member of the gffft?
    const posterUid = iamUser.id
    const posterRef = ref(usersCollection, posterUid)

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = get(ref(gffftMembers, posterUid))
    const itemPromise = get(itemRef)

    const gffft = await gffftPromise
    // make sure the gffft exists
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const membershipDoc = await membershipPromise
    if (!membershipDoc) {
      console.log("poster is not a member of this gffft")
      res.sendStatus(403)
      return
    }

    // todo: poster must be either the original photo poster, or a gffft owner

    const itemDoc = await itemPromise
    if (!itemDoc) {
      res.sendStatus(404)
      return
    }

    const membership = membershipDoc.data
    const item = itemDoc.data
    if (membership.type != TYPE_OWNER && posterRef.id != item.author.id) {
      console.log("poster is not an owner of this item")
      res.sendStatus(403)
      return
    }

    item.description = description

    upset<GalleryItem>(itemRef, item)

    const hgi = await hydrateGalleryItem(gid, uid, item)
    if (hgi == null) {
      console.warn(`Hydrated gallery item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    res.json(galleryItemToJson(iamUser, membership, hgi))
  })

const likeItemParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
  iid: Joi.string().required(),
})
export interface LikeItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Fields]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
}

router.post(
  "/like",
  validator.fields(likeItemParams),
  requiredAuthentication,
  async (req: ValidatedRequest<LikeItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const posterUid = iamUser.id

    let uid: string = req.body.uid
    let gid: string = req.body.gid
    const mid: string = req.body.mid
    const iid: string = req.body.iid

    console.log(`like, uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)

    if (uid == "me") {
      uid = iamUser.id
    }

    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const galleries = galleryCollection(ref(gfffts, gid))
    const galleryRef = ref(galleries, mid)
    const galleryItems = galleryItemsCollection(galleryRef)
    const itemRef = ref(galleryItems, iid)

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = await getGffftMembership(uid, gid, posterUid)
    const itemPromise = get(itemRef)

    const gffft = await gffftPromise
    // make sure the gffft exists
    if (!gffft) {
      console.log(`gffft not found, gid: ${gid}`)
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const membership = await membershipPromise
    const itemDoc = await itemPromise
    const item = itemOrNull(itemDoc)

    if (!item) {
      console.log(`item not found, gid: ${iid}`)
      res.sendStatus(404)
      return
    }

    const likes: string[] = item.likes ?? []
    const itemIndex = likes.indexOf(posterUid, 0)
    if (itemIndex > -1) {
      likes.splice(itemIndex, 1)
    } else {
      likes.push(posterUid)
    }
    item.likes = likes
    item.likeCount = likes.length

    // console.log(`item: ${iid} likes: ${likes}`)

    await upset<GalleryItem>(itemRef, item)

    const hgi = await hydrateGalleryItem(gid, uid, item, posterUid)
    if (hgi == null) {
      console.warn(`Hydrated gallery item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    console.log(`hgi: ${JSON.stringify(hgi)}`)
    res.json(galleryItemToJson(iamUser, membership, hgi))
  })

export default router

