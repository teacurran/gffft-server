import express, {Response} from "express"

import {createGffft, getGffft, getGfffts,
  getUniqueFruitCode, gffftsCollection, gffftsMembersCollection, hydrateGffft, updateGffft} from "./gffft_data"

import {LoggedInUser, optionalAuthentication, requiredAuthentication} from "../accounts/auth"
import {Gffft, TYPE_OWNER} from "./gffft_models"
import {fruitCodeToJson, gffftsToJson, gffftToJson} from "./gffft_interfaces"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {get, getRefPath, ref, upset} from "typesaurus"
import {boardsCollection, getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {Gallery} from "../galleries/gallery_models"
import {galleryCollection, getOrCreateDefaultGallery} from "../galleries/gallery_data"
import {Notebook} from "../notebooks/notebook_models"
import {getOrCreateDefaultNotebook, notebookCollection} from "../notebooks/notebook_data"
import {Calendar} from "../calendars/calendar_models"
import {calendarsCollection, getOrCreateDefaultCalendar} from "../calendars/calendar_data"
import * as Joi from "joi"
import {getOrCreateDefaultLinkSet, linkSetCollection} from "../link-sets/link_set_data"

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
 *       calendarEnabled:
 *         type: boolean
 *       notebookEnabled:
 *         type: boolean
 *       boardEnabled:
 *         type: boolean
 *       galleryEnabled:
 *         type: boolean
 *
*/
const gffftUpdateRequestParams = Joi.object({
  id: Joi.string().allow(null),
  name: Joi.string().required(),
  description: Joi.string().optional().allow(null, ""),
  intro: Joi.string().optional().allow(null, ""),
  tags: Joi.array().items(Joi.string()).allow(null),
  enabled: Joi.bool().default(false),
  allowMembers: Joi.bool().default(false),
  requireApproval: Joi.bool().default(false),
  enableAltHandles: Joi.bool().default(true),
  pagesEnabled: Joi.bool().default(false),
  calendarEnabled: Joi.bool().default(false),
  notebookEnabled: Joi.bool().default(false),
  boardEnabled: Joi.bool().default(false),
  galleryEnabled: Joi.bool().default(false),
  fruitCodeReset: Joi.bool().default(false),
})
export interface GffftUpdateRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    name: string;
    description: string;
    intro?: string,
    tags?: string[],
    enabled: boolean,
    allowMembers: boolean,
    requireApproval: boolean,
    enableAltHandles: boolean,
    calendarEnabled: boolean,
    notebookEnabled: boolean,
    boardEnabled: boolean,
    galleryEnabled: boolean,
    fruitCodeReset: boolean,
  };
}

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.get(
  "/",
  optionalAuthentication,
  validator.query(gffftListRequestParams),
  async (req: ValidatedRequest<GffftListRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser
    getGfffts(req.query.offset, req.query.max, req.query.q, iamUser?.id).then((items) => {
      res.json(gffftsToJson(items))
    })
  }
)

const gffftPatchRequestParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  name: Joi.string().optional(),
  description: Joi.string().optional().allow(null, ""),
  intro: Joi.string().optional().allow(null, ""),
  tags: Joi.array().items(Joi.string()).optional(),
  enabled: Joi.boolean().optional(),
  allowMembers: Joi.boolean().optional(),
  boardEnabled: Joi.boolean().optional(),
  calendarEnabled: Joi.boolean().optional(),
  galleryEnabled: Joi.boolean().optional(),
  notebookEnabled: Joi.boolean().optional(),
  linkSetEnabled: Joi.boolean().optional(),
  fruitCodeReset: Joi.boolean().optional(),
  fruitCodeEnabled: Joi.boolean().optional(),
})

export interface GffftPatchRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    name?: string;
    description?: string;
    intro?: string,
    tags?: string[],
    enabled?: boolean,
    allowMembers?: boolean,
    boardEnabled?: boolean,
    calendarEnabled?: boolean,
    galleryEnabled?: boolean,
    notebookEnabled?: boolean,
    linkSetEnabled?: boolean,
    fruitCodeReset?: boolean,
    fruitCodeEnabled?: boolean,
  };
}

router.patch(
  "/",
  requiredAuthentication,
  validator.body(gffftPatchRequestParams),
  async (
    req: ValidatedRequest<GffftPatchRequest>,
    res: Response,
  ) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    const body = req.body

    let uid = body.uid
    if (uid == "me") {
      uid = iamUser.id
    }
    let gid = body.gid

    const gffft = await getGffft(uid, gid)

    if (gffft != null) {
      gid = gffft.id
      if (body.name != undefined) {
        gffft.name = body.name
      }

      gffft.intro = body.intro != undefined && body.intro.length > 0 ? body.intro : undefined
      gffft.description = body.description != undefined && body.description.length > 0 ? body.description : undefined

      if (body.enabled != undefined) {
        gffft.enabled = body.enabled
      }
      if (body.allowMembers != undefined) {
        gffft.allowMembers = body.allowMembers
      }

      const features: string[] = gffft.features ?? []
      if (body.boardEnabled != undefined) {
        console.log(`got board enable:${body.boardEnabled}`)

        const board: Board = await getOrCreateDefaultBoard(uid, gid)
        const userBoards = boardsCollection([uid, gid])
        const itemRef = getRefPath(ref(userBoards, board.id))

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.boardEnabled) {
          features.push(itemRef)
        }
      }
      if (body.calendarEnabled != undefined) {
        console.log(`got calendar enable:${body.calendarEnabled}`)
        const calendar: Calendar = await getOrCreateDefaultCalendar(uid, gid)
        const calendars = calendarsCollection([uid, gid])
        const itemRef = getRefPath(ref(calendars, calendar.id))

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.calendarEnabled) {
          features.push(itemRef)
        }
      }
      if (body.galleryEnabled != undefined) {
        console.log(`got gallery enable:${body.galleryEnabled}`)
        const gallery: Gallery = await getOrCreateDefaultGallery(uid, gid)
        const galleries = galleryCollection([uid, gid])
        const itemRef = getRefPath(ref(galleries, gallery.id))

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.galleryEnabled) {
          features.push(itemRef)
        }
      }
      if (body.notebookEnabled != undefined) {
        console.log(`got notebook enable:${body.notebookEnabled}`)
        const notebook: Notebook = await getOrCreateDefaultNotebook(iamUser.id, gffft.id)
        const userNotebooks = notebookCollection([iamUser.id, gffft.id])
        const itemRef = getRefPath(ref(userNotebooks, notebook.id))

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.notebookEnabled) {
          features.push(itemRef)
        }
      }
      if (body.linkSetEnabled != undefined) {
        console.log(`got link-set enable:${body.linkSetEnabled}`)

        const linkSet = await getOrCreateDefaultLinkSet(iamUser.id, gffft.id)
        const linkSets = linkSetCollection(ref(gffftsCollection(iamUser.id), gffft.id))
        const itemRef = getRefPath(ref(linkSets, linkSet.id))

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.linkSetEnabled) {
          features.push(itemRef)
        }
      }
      if (body.fruitCodeEnabled != undefined) {
        console.log(`got fruit-code enable:${body.fruitCodeEnabled}`)

        const itemRef = "fruitCode"

        const itemIndex = features.indexOf(itemRef, 0)
        if (itemIndex > -1) {
          features.splice(itemIndex, 1)
        }
        if (body.fruitCodeEnabled) {
          features.push(itemRef)
        }
      }

      if (body.fruitCodeReset === true) {
        [gffft.fruitCode,
          gffft.rareFruits,
          gffft.ultraRareFruits] = await getUniqueFruitCode()
      }

      gffft.features = features

      updateGffft(iamUser.id, gffft.id, gffft).then(() => {
        res.sendStatus(204)
      })
    }
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

    const item = req.body

    const gffft = await getGffft(item.uid, item.gid)
    if (gffft == null) {
      res.sendStatus(404)
      return
    }

    gffft.description = item.description
    gffft.enableAltHandles = item.enableAltHandles
    gffft.intro = item.intro
    gffft.name = item.name
    gffft.enabled = item.enabled
    gffft.allowMembers = item.allowMembers
    gffft.requireApproval = item.requireApproval

    const features: string[] = []
    if (item.boardEnabled) {
      const board: Board = await getOrCreateDefaultBoard(iamUser.id, gffft.id)
      const userBoards = boardsCollection([iamUser.id, gffft.id])
      if (board.id) {
        features.push(getRefPath(ref(userBoards, board.id)))
      }
    }

    if (item.galleryEnabled) {
      const gallery: Gallery = await getOrCreateDefaultGallery(iamUser.id, gffft.id)
      const userGalleries = galleryCollection([iamUser.id, gffft.id])
      features.push(getRefPath(ref(userGalleries, gallery.id)))
    }

    if (item.notebookEnabled) {
      const notebook: Notebook = await getOrCreateDefaultNotebook(iamUser.id, gffft.id)
      const userNotebooks = notebookCollection([iamUser.id, gffft.id])
      if (notebook.id) {
        features.push(getRefPath(ref(userNotebooks, notebook.id)))
      }
    }

    if (item.calendarEnabled) {
      const calendar: Calendar = await getOrCreateDefaultCalendar(iamUser.id, gffft.id)
      const userCalendars = calendarsCollection([iamUser.id, gffft.id])
      features.push(getRefPath(ref(userCalendars, calendar.id)))
    }

    gffft.tags = item.tags

    gffft.features = features
    gffft.createdAt = gffft.createdAt ?? new Date()
    gffft.updatedAt = new Date()

    updateGffft(iamUser.id, gffft.id, gffft).then(() => {
      res.sendStatus(204)
    })
  }
)

const fruitCodeParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
})
export interface FruitCodeRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
  }
}
export interface FruitCodeBodyRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
  }
}

router.get(
  "/fruit-code",
  requiredAuthentication,
  validator.query(fruitCodeParams),
  async (req: ValidatedRequest<FruitCodeRequest>, res: Response) => {
    const gffft = await getGffft(req.query.uid, req.query.gid)

    if (!gffft) {
      res.sendStatus(404)
      return
    }

    if (!gffft?.fruitCode) {
      console.error(`gffft encounterd without id:${gffft?.id} fruitCode:${gffft?.fruitCode}`)
      res.sendStatus(500)
      return
    }

    res.json(fruitCodeToJson(gffft?.fruitCode ?? ""))
  }
)

router.put(
  "/fruit-code",
  requiredAuthentication,
  validator.body(fruitCodeParams),
  async (req: ValidatedRequest<FruitCodeBodyRequest>, res: Response) => {
    const gffft = await getGffft(req.body.uid, req.body.gid)

    if (gffft == null) {
      res.sendStatus(404)
      return
    }

    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id

    const gffftMembers = gffftsMembersCollection([userId, gffft.id])
    const memberRef = ref(gffftMembers, userId)

    const gfffts = gffftsCollection(userId)
    const gffftRef = ref(gfffts, gffft.id)

    const isOwner = await get(memberRef).then((snapshot) => {
      if (snapshot == null) {
        return false
      }
      const member = snapshot.data
      return member.type == TYPE_OWNER
    })

    if (isOwner) {
      [gffft.fruitCode,
        gffft.rareFruits,
        gffft.ultraRareFruits] = await getUniqueFruitCode()

      await upset(gffftRef, gffft)
    }

    res.json(fruitCodeToJson(gffft.fruitCode ?? ""))
  }
)

const gffftCreateRequestParams = Joi.object({
  id: Joi.string().allow(null),
  name: Joi.string().required(),
  description: Joi.string().optional().allow(null, ""),
  intro: Joi.string().optional().allow(null, ""),
  initialHandle: Joi.string().required(),
})
export interface GffftCreateRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    id?: string
    name: string;
    description?: string;
    intro?: string,
    initialHandle: string;
  };
}

router.post(
  "/",
  requiredAuthentication,
  validator.body(gffftCreateRequestParams),
  async (
    req: ValidatedRequest<GffftCreateRequest>,
    res: Response,
  ) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const item = req.body

    let gffft: Gffft = {
      name: item.name,
      description: item.description && item.description.length > 0 ? item.description : undefined,
      intro: item.intro && item.intro.length > 0 ? item.intro : undefined,
      enabled: false,
      allowMembers: false,
      requireApproval: false,
    } as Gffft

    gffft = await createGffft(iamUser.id, gffft, item.initialHandle)
    const hydratedGffft = await hydrateGffft(iamUser.id, gffft)

    if (hydratedGffft == null) {
      res.status(500).send(`error creating gffft: uid: ${iamUser.id}`)
      return
    }

    res.json(gffftToJson(hydratedGffft))
  }
)


export default router


