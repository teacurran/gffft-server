import express, {Request, Response} from "express"

import {getGfffts, getOrCreateDefaultGffft, updateGffft} from "./gffft_data"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {Gffft} from "./gffft_models"
import {gffftsToJson, gffftToJson} from "./gffft_types"
import Joi from "joi"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"

export interface GffftListRequest extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    q?: string
    max: number
    offset?: string
  };
}
const gffftListRequestParams = Joi.object({
  q: Joi.string().optional(),
  max: Joi.number().optional().max(100).default(10),
  offset: Joi.string().optional(),
})


/**
 * @swagger
 * definitions:
 *   GffftUpdateRequest:
 *     type: object
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       description:
 *         type: string
 *       intro:
 *         type: string
 *       enabled:
 *         type: boolean
 *       allowMembers:
 *         type: boolean
 *       allowAltHandles:
 *         type: boolean
 *       requireApproval:
 *         type: boolean
 *       pagesEnabled:
 *         type: boolean
 *       pagesWhoCanEdit:
 *         type: string
 *       pagesWhoCanView:
 *         type: string
 *       boardEnabled:
 *         type: boolean
 *       boardWHoCanView:
 *         type: string
 *       boardWhoCanPost:
 *         type: String
 *       galleryEnabled:
 *         type: boolean
 *       galleryWHoCanView:
 *         type: string
 *       galleryWhoCanPost:
 *         type: string
 *
*/
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
  "/",
  validator.query(gffftListRequestParams),
  requiredAuthentication,
  async (req: ValidatedRequest<GffftListRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    getGfffts(iamUser.id, req.query.offset, req.query.max, req.query.q).then((items) => {
      res.json(gffftsToJson(items))
    })
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
    const iamUser: LoggedInUser = res.locals.iamUser
    const gffft: Gffft = await getOrCreateDefaultGffft(iamUser.id)

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
    gffft.tags = item.tags

    gffft.createdAt = gffft.createdAt ?? new Date()
    gffft.updatedAt = new Date()

    updateGffft(iamUser.id, gffft).then(() => {
      res.sendStatus(204)
    })
  }
)

router.get(
  "/default",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const gffft: Gffft = await getOrCreateDefaultGffft(iamUser.id)

    res.json(gffftToJson(gffft))
  }
)


export default router

