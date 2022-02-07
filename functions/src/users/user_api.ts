import express, {Request, Response} from "express"
import {createBookmark, deleteBookmark, getBookmark, getHydratedUserBookmarks,
  getUniqueUsername,
  getUser, usersCollection} from "./user_data"
import {LoggedInUser, optionalAuthentication, requiredAuthentication} from "../auth"
import {User, UserBookmark, UsernameChange} from "./user_models"
import {getBoard, getBoardByRefString, getThread, getThreads} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {checkGffftHandle, createGffftMembership, deleteGffftMembership, getGffft,
  getGffftMembership} from "../gfffts/gffft_data"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {gffftToJson, IGffftFeatureRef} from "../gfffts/gffft_interfaces"
import {getGallery, getGalleryByRefString, getGalleryItem,
  getGalleryItems, hydrateGallery} from "../galleries/gallery_data"
import {Gallery} from "../galleries/gallery_models"
import {Notebook} from "../notebooks/notebook_models"
import {getCalendarByRef} from "../calendars/calendar_data"
import {boardToJson, IBoardType, threadsToJson, threadToJson} from "../boards/board_interfaces"
import {getNotebookByRef} from "../notebooks/notebook_data"
import {INotebookType, notebookToJson} from "../notebooks/notebook_interfaces"
import {bookmarksToJson, iamUserToJson} from "./user_interfaces"
import * as Joi from "@hapi/joi"
import {upset, value} from "typesaurus"
import {galleryItemToJson, galleryToJson, galleryToJsonWithItems} from "../galleries/gallery_interfaces"
import {calendarToJson, ICalendarType} from "../calendars/calendar_interfaces"
import {IGalleryType} from "../galleries/gallery_types"
import {GffftMember} from "../gfffts/gffft_models"

// const userUpdateRequestParams = Joi.object({
//   uid: Joi.string().required(),
//   displayName: Joi.string().required(),
// })
// export interface UserUpdateRequest extends ValidatedRequestSchema {
//     [ContainerTypes.Body]: {
//       uid: string;
//       displayName: string;
//     };
//   }

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.get(
  "/me",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const user: User = await getUser(userId)

    res.json(iamUserToJson(user))
  }
)

router.get(
  "/me/bookmarks",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const bookmarks = await getHydratedUserBookmarks(userId)

    res.json(bookmarksToJson(bookmarks))
  }
)


export const getGffftByIdParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
})
export interface GetGffftByIdRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string;
    gid: string;
  };
}
router.get(
  "/:uid/gfffts/:gid",
  optionalAuthentication,
  validator.params(getGffftByIdParams),
  async (req: ValidatedRequest<GetGffftByIdRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid

    if (uid == "me") {
      if (iamUser == null) {
        res.status(403).send("Unauthorized: Token expired")
        return
      } else {
        uid = iamUser.id
      }
    }

    const gffft = await getGffft(uid, gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const boards: Board[] = []
    const calendars: ICalendarType[] = []
    const galleries: Gallery[] = []
    const notebooks: Notebook[] = []
    const features: IGffftFeatureRef[] = []

    if (gffft.features) {
      for (let i=0; i<gffft.features.length; i++) {
        const feature = gffft.features[i]
        console.log(`looking at feature: ${feature}`)
        if (feature.indexOf("/boards/") != -1) {
          const board = await getBoardByRefString(feature)
          if (board) {
            boards.push(board)
            if (board.id) {
              features.push({
                type: "board",
                id: board.id,
              })
            }
          }
        } else if (feature.indexOf("/calendars/") != -1) {
          const calendar = await getCalendarByRef(feature)
          const calendarJson = calendarToJson(calendar)
          if (calendarJson != null) {
            calendars.push(calendarJson)
            features.push({
              type: "calendar",
              id: calendarJson.id,
            })
          }
        } else if (feature.indexOf("/galleries/") != -1) {
          const gallery = await getGalleryByRefString(feature)
          if (gallery) {
            galleries.push(gallery)
            features.push({
              type: "gallery",
              id: gallery.id,
            })
          }
        } else if (feature.indexOf("/notebooks/") != -1) {
          const notebook = await getNotebookByRef(feature)
          if (notebook) {
            notebooks.push(notebook)
            if (notebook.id) {
              features.push({
                type: "notebook",
                id: notebook.id,
              })
            }
          }
        }
      }
    }

    const boardJson: IBoardType[] = []
    boards.forEach((board) => {
      const json = boardToJson(board)
      if (json != null) {
        boardJson.push(json)
      }
    })

    const notebookJson: INotebookType[] = []
    notebooks.forEach((notebook) => {
      const json = notebookToJson(notebook)
      if (json != null) {
        notebookJson.push(json)
      }
    })

    const galleryJson: IGalleryType[] = []
    galleries.forEach((gallery) => {
      const json = galleryToJson(gallery)
      if (json != null) {
        galleryJson.push(json)
      }
    })


    let membership: GffftMember | undefined
    let bookmark: UserBookmark | undefined
    let user: User | undefined
    if (iamUser != null) {
      membership = await getGffftMembership(uid, gid, iamUser.id)
      bookmark = await getBookmark(uid, gid, iamUser.id)
      user = await getUser(iamUser.id)
    }

    res.json(gffftToJson(gffft, user, membership, bookmark, features, boardJson, calendars, galleryJson, notebookJson))
  }
)

export const getBoardThreadsPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
})
export const getBoardThreadsQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetBoardThreadsRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    bid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads",
  optionalAuthentication,
  validator.params(getBoardThreadsPathParams),
  validator.query(getBoardThreadsQueryParams),
  async (req: ValidatedRequest<GetBoardThreadsRequest>, res: Response) => {
    const iamUser: LoggedInUser | undefined = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const bid = req.params.bid

    if (uid == "me") {
      if (iamUser) {
        uid = iamUser.id
      }
    }

    // make sure the gffft exists
    const gffft = await getGffft(uid, gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    // const iamUser: LoggedInUser = res.locals.iamUser
    // const gffft = await getGffft(uid, gid)
    const board = await getBoard(uid, gid, bid)

    if (!board) {
      res.sendStatus(404)
      return
    }

    getThreads(uid, gid, bid, req.query.offset, req.query.max).then(
      (items) => {
        res.json(threadsToJson(items))
      }
    )
  }
)

export const getThreadPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
  tid: Joi.string().required(),
})
export const getThreadQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetThreadsRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    bid: string
    tid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}

router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads/:tid",
  requiredAuthentication,
  validator.params(getThreadPathParams),
  validator.query(getThreadQueryParams),
  async (req: ValidatedRequest<GetThreadsRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const bid = req.params.bid
    const tid = req.params.tid

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


    // const iamUser: LoggedInUser = res.locals.iamUser
    // const gffft = await getGffft(uid, gid)
    const board = await getBoard(uid, gid, bid)

    if (!board) {
      res.sendStatus(404)
      return
    }

    getThread(uid, gid, bid, tid, req.query.offset, req.query.max).then(
      (thread) => {
        if (thread == null) {
          res.sendStatus(404)
          return
        }
        res.json(threadToJson(thread))
      }
    )
  }
)


const createMemberParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  handle: Joi.string().optional().allow(null),
})
export interface CreateMemberRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    handle: string
  }
}

router.post(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const uid = req.body.uid
    const gid = req.body.gid
    const handle = req.body.handle
    const memberId = res.locals.iamUser.id

    if (!checkGffftHandle(uid, gid, memberId, handle)) {
      res.status(400).send("handle exists")
    }

    await createGffftMembership(uid, gid, memberId, handle)
    await createBookmark(uid, gid, memberId)
    res.sendStatus(204)
  })

router.delete(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const uid = req.body.uid
    const gid = req.body.gid
    const memberId = res.locals.iamUser.id

    await deleteGffftMembership(uid, gid, memberId)
    res.sendStatus(204)
  })

router.post(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const uid = req.body.uid
    const gid = req.body.gid

    const memberId = res.locals.iamUser.id

    await createBookmark(uid, gid, memberId)
    res.sendStatus(204)
  })

router.delete(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const gid = req.body.gid

    const memberId = res.locals.iamUser.id

    await deleteBookmark(gid, memberId)
    res.sendStatus(204)
  })

router.post(
  "/me/change-username",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const user: User = await getUser(userId)
    user.username = await getUniqueUsername(false)

    user.updatedAt = new Date()
    await upset<UsernameChange>(usersCollection, userId, {
      username: user.username,
      usernameCounter: value("increment", 1),
      updatedAt: new Date(),
    })

    res.json(iamUserToJson(user))
  }
)

export const getGalleryPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
})
export const getGalleryQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetGalleryRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
router.get(
  "/:uid/gfffts/:gid/galleries/:mid",
  requiredAuthentication,
  validator.params(getGalleryPathParams),
  validator.query(getGalleryQueryParams),
  async (req: ValidatedRequest<GetGalleryRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid

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

    const gallery = await getGallery(uid, gid, mid)

    if (!gallery) {
      res.sendStatus(404)
      return
    }

    const items = await getGalleryItems(uid, gid, mid, req.query.offset, req.query.max)

    const hydratedGallery = await hydrateGallery(gallery, items)
    if (hydratedGallery == null) {
      res.sendStatus(404)
      return
    }

    res.json(galleryToJsonWithItems(hydratedGallery))
  }
)

export const getGalleryItemPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
  iid: Joi.string().required(),
})
export interface GetGalleryItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
router.get(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  requiredAuthentication,
  validator.params(getGalleryItemPathParams),
  async (req: ValidatedRequest<GetGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid

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

    const gallery = await getGallery(uid, gid, mid)

    if (!gallery) {
      res.sendStatus(404)
      return
    }

    const item = await getGalleryItem(uid, gid, mid, req.params.iid)

    res.json(galleryItemToJson(item))
  }
)


export default router

