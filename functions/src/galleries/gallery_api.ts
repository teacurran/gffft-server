import express, {Response} from "express"


import {LoggedInUser, requiredAuthentication} from "../auth"
import {getGffft, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {get, ref} from "typesaurus"
import * as Joi from "@hapi/joi"
import multer from "multer"
import {v4 as uuid} from "uuid"
import * as firebaseAdmin from "firebase-admin"

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

    let uid = req.body.uid
    let gid = req.body.gid
    const mid = req.body.mid
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
    // const posterRef = ref(usersCollection, posterUid)

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
    const fileName = `${uuid()}.${type}`

    const filePath = `users/${uid}/gfffts/${gid}/galleries/${mid}/items/${fileName}`

    const fileRef = await firebaseAdmin.storage().bucket().upload(file.path, {destination: filePath})
    console.log(`file response: ${JSON.stringify(fileRef)}`)

    res.sendStatus(204)
  }
)

export default router

