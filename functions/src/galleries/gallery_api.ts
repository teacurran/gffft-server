import express, {Response} from "express"


import {LoggedInUser, requiredAuthentication} from "../auth"
import {getGffft, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {get, ref, upset} from "typesaurus"
import * as Joi from "@hapi/joi"
import multer from "multer"
import {uuid} from "uuidv4"
import * as firebaseAdmin from "firebase-admin"
import {galleryItemsCollection, hydrateGalleryItem} from "./gallery_data"
import {GalleryItem} from "./gallery_models"
import {usersCollection} from "../users/user_data"
import {galleryItemToJson} from "./gallery_interfaces"

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

    await firebaseAdmin.storage()
      .bucket("gffft-auth.appspot.com").upload(file.path, {
        destination: fullFilePath,
        metadata: md,
      })


    const itemsCollection = galleryItemsCollection([uid, gid, mid])
    const itemRef = ref(itemsCollection, itemId)
    const item = {
      author: posterRef,
      createdAt: new Date(),
      fileName: fileName,
      path: filePath,
    } as GalleryItem
    await upset(itemRef, item)

    item.id = itemId

    const hgi = await hydrateGalleryItem(item)
    if (hgi == null) {
      console.warn(`Hydrated gallery item was null when it shouldn't be: ${hgi}`)
      res.sendStatus(404)
      return
    }
    res.json(galleryItemToJson(hgi))
  }
)

export default router

