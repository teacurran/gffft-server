import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication, requiredGffftMembership} from "../accounts/auth"
import {getGffftMembership} from "../gfffts/gffft_data"
import {GffftMember, TYPE_OWNER} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {get, ref, upset} from "typesaurus"
import * as Joi from "joi"
import multer from "multer"
import {uuid} from "uuidv4"
import * as firebaseAdmin from "firebase-admin"
import {getGalleryItemRef, hydrateGalleryItem} from "./gallery_data"
import {GalleryItem} from "./gallery_models"
import {usersCollection} from "../users/user_data"
import {galleryItemToJson} from "./gallery_interfaces"
import {itemOrNull} from "../common/data"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

const multerStorage = multer.diskStorage({
  destination: function(_req, _file, cb) {
    cb(null, "/tmp/")
  },
  filename: function(_req, file, cb) {
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
  requiredGffftMembership,
  async (req: ValidatedRequest<CreateItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    const uid: string = res.locals.uid
    const gid: string = res.locals.gid

    const mid: string = req.body.mid
    const description = req.body.description

    console.log(`creating gallery item: uid:${uid} gid:${gid} mid:${mid} description: ${description}`)

    const posterRef = ref(usersCollection, iamUser.id)
    const membership: GffftMember = res.locals.gffftMembership

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = (req as any).files

    if (files == undefined) {
      res.sendStatus(500)
      return
    }

    const file = files[0]
    const type = file.originalname.split(".")[1]
    const itemId = uuid()

    const fileName = `${itemId}.${type}`

    const filePath = `users/${iamUser.id}/gfffts/${gid}/galleries/${mid}/items`
    const fullFilePath = `${filePath}/${fileName}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md: { [key: string]: any } = {
      metadata: {uid, gid, mid, iid: itemId},
    }

    await firebaseAdmin.storage()
      .bucket("gffft-auth.appspot.com").upload(file.path, {
        destination: fullFilePath,
        metadata: md,
      })

    const itemRef = getGalleryItemRef(uid, gid, mid, itemId)
    const item = {
      author: posterRef,
      createdAt: new Date(),
      fileName: fileName,
      filePath: filePath,
      description: description,
    } as GalleryItem
    await upset(itemRef, item)

    item.id = itemId

    const hgi = await hydrateGalleryItem(uid, gid, item)
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
  requiredGffftMembership,
  async (req: ValidatedRequest<UpdateItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    const uid: string = res.locals.uid
    const gid: string = res.locals.gid

    const mid: string = req.body.mid
    const iid: string = req.body.iid
    const description = req.body.description

    const itemRef = getGalleryItemRef(uid, gid, mid, iid)
    const itemPromise = get(itemRef)

    const itemDoc = await itemPromise
    if (!itemDoc) {
      res.sendStatus(404)
      return
    }

    const posterRef = ref(usersCollection, iamUser.id)
    const membership: GffftMember = res.locals.gffftMembership
    const item = itemDoc.data
    if (membership.type != TYPE_OWNER && posterRef.id != item.author.id) {
      console.log("poster is not an owner of this item")
      res.sendStatus(403)
      return
    }

    item.description = description

    upset<GalleryItem>(itemRef, item)

    const hgi = await hydrateGalleryItem(uid, gid, item)
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
  requiredGffftMembership,
  async (req: ValidatedRequest<LikeItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const posterUid = iamUser.id

    const uid: string = res.locals.uid
    const gid: string = res.locals.gid

    const mid: string = req.body.mid
    const iid: string = req.body.iid

    console.log(`like, uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)

    const itemRef = getGalleryItemRef(uid, gid, mid, iid)
    const membershipPromise = getGffftMembership(uid, gid, posterUid)
    const itemPromise = get(itemRef)

    const membership = await membershipPromise
    const item = itemOrNull(await itemPromise)

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

    const hgi = await hydrateGalleryItem(uid, gid, item, posterUid)
    if (hgi == null) {
      console.warn(`Hydrated gallery item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    console.log(`hgi: ${JSON.stringify(hgi)}`)
    res.json(galleryItemToJson(iamUser, membership, hgi))
  })

export default router

