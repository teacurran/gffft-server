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
const multerStorage = multer.memoryStorage()
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

    const file = req.file

    if (file != null) {
      const type = file.originalname.split(".")[1]
      const fileName = `${uuid()}.${type}`

      const filePath = `${uid}/${gid}/${mid}/${fileName}`

      const fileRef = await firebaseAdmin.storage().bucket().upload(file.path, {destination: filePath})
      console.log(`file response: ${JSON.stringify(fileRef)}`)

      res.sendStatus(204)
    }


    res.sendStatus(204)
  }
)

export default router

