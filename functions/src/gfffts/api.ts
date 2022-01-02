import express, {Request, Response} from "express"

import * as firebaseAdmin from "firebase-admin"
import {getOrCreateDefaultGffft, updateGffft} from "./data"
import UserRecord = firebaseAdmin.auth.UserRecord

import {requiredAuthentication} from "../auth"
import {Gffft} from "./models"
import {gffftToJson} from "./types"
import Joi = require("joi")
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"

const gffftUpdateRequestParams = Joi.object({
  id: Joi.string().allow(null),
  name: Joi.string().required(),
  description: Joi.string(),
  intro: Joi.string().allow(null),
  tags: Joi.array().items(Joi.string()).allow(null),
  enabled: Joi.bool().default(false),
  allowMembers: Joi.bool().default(false),
  requireApproval: Joi.bool().default(false),
  enableAltHandles: Joi.bool().default(true),
  pagesEnabled: Joi.bool().default(false),
  pagesWhoCanView: Joi.string().allow(null),
  pagesWhoCanEdit: Joi.string().allow(null),
  boardEnabled: Joi.bool().default(false),
  boardWhoCanView: Joi.string().allow(null),
  boardWhoCanPost: Joi.string().allow(null),
  galleryEnabled: Joi.bool().default(false),
  galleryWhoCanView: Joi.string().allow(null),
  galleryWhoCanPost: Joi.string().allow(null),
})
export interface GffftUpdateRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    id?: string
    name: string;
    description: string;
    intro?: string,
    tags?: string[],
    enabled: boolean,
    allowMembers: boolean,
    requireApproval: boolean,
    enableAltHandles: boolean,
    pagesEnabled: boolean,
    pagesWhoCanView?: string,
    pagesWhoCanEdit?: string,
    boardEnabled: boolean,
    boardWhoCanView?: string,
    boardWhoCanPost?: string,
    galleryEnabled: boolean,
    galleryWhoCanView?: string,
    galleryWhoCanPost?: string,
  };
}


// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.get(
  "/default",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: UserRecord = res.locals.iamUser
    const gffft: Gffft = await getOrCreateDefaultGffft(iamUser.uid)

    res.json(gffftToJson(gffft))
  }
)

router.put(
  "/",
  requiredAuthentication,
  validator.body(gffftUpdateRequestParams),
  async (
    req: ValidatedRequest<GffftUpdateRequest>,
    res: Response,
  ) => {
    const iamUser: UserRecord = res.locals.iamUser
    const gffft: Gffft = await getOrCreateDefaultGffft(iamUser.uid)

    const item = req.body

    gffft.description = item.description
    gffft.enableAltHandles = item.enableAltHandles
    gffft.intro = item.intro
    gffft.name = item.name
    gffft.enabled = item.enabled
    gffft.allowMembers = item.allowMembers
    gffft.requireApproval = item.requireApproval

    gffft.boardEnabled = item.boardEnabled
    gffft.boardWhoCanPost = item.boardWhoCanPost
    gffft.boardWhoCanView = item.boardWhoCanView

    gffft.galleryEnabled = item.galleryEnabled
    gffft.galleryWhoCanPost = item.galleryWhoCanPost
    gffft.galleryWhoCanView = item.galleryWhoCanView

    gffft.pagesEnabled = item.pagesEnabled
    gffft.pagesWhoCanEdit = item.pagesWhoCanEdit
    gffft.pagesWhoCanView = item.pagesWhoCanView

    updateGffft(iamUser.uid, gffft).then(() => {
      res.sendStatus(204)
    })
  }
)


export default router

