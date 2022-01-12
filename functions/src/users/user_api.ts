import express, {Request, Response} from "express"

import {getUser, iamUserToJson} from "./user_data"


// import {
//   ContainerTypes,
//   createValidator,
//   ValidatedRequestSchema,
// } from "express-joi-validation"
import {LoggedInUser, requiredAuthentication} from "../auth"
import {User} from "./user_models"
import {getBoard, getBoardByRefString, getOrCreateDefaultBoard, getThreads} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {createGffftMembership, getGffft, getGffftMembership, getOrCreateDefaultGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import Joi from "joi"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {gffftMemberToJson, gffftToJson, IGffftFeatureRef} from "../gfffts/gffft_types"
import {getGalleryByRef} from "../galleries/gallery_data"
import {Calendar} from "../calendars/calendar_models"
import {Gallery} from "../galleries/gallery_models"
import {Notebook} from "../notebooks/notebook_models"
import {getCalendarByRef} from "../calendars/calendar_data"
import {boardToJson, IBoardType, threadsToJson} from "../boards/board_interfaces"
import {getNotebookByRef} from "../notebooks/notebook_data"
import {INotebookType, notebookToJson} from "../notebooks/notebook_interfaces"
// import Joi from "joi"

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
    const gffft: Gffft = await getOrCreateDefaultGffft(userId)
    const board: Board = await getOrCreateDefaultBoard(userId, gffft.id)

    res.json(iamUserToJson(iamUser, user, board))
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
  requiredAuthentication,
  validator.params(getGffftByIdParams),
  async (req: ValidatedRequest<GetGffftByIdRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const gffft = await getGffft(req.params.uid, req.params.gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }

    const boards: Board[] = []
    const calendars: Calendar[] = []
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
          if (calendar) {
            calendars.push(calendar)
            features.push({
              type: "calendar",
              id: calendar.id,
            })
          }
        } else if (feature.indexOf("/galleries/") != -1) {
          const gallery = await getGalleryByRef(feature)
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

    const membership = await getGffftMembership(req.params.uid, req.params.gid, iamUser.id)

    res.json(gffftToJson(gffft, membership, features, boardJson, calendars, galleries, notebookJson))
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
  requiredAuthentication,
  validator.params(getBoardThreadsPathParams),
  validator.query(getBoardThreadsQueryParams),
  async (req: ValidatedRequest<GetBoardThreadsRequest>, res: Response) => {
    const uid = req.params.uid
    const gid = req.params.gid
    const bid = req.params.bid

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

const createMemberParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
})
export interface CreateMemberRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
  }
}

router.post(
  "/:uid/gfffts/:gid/members",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const uid = req.body.uid
    const gid = req.body.gid

    const membership = await createGffftMembership(uid, gid, res.locals.iamUser.id)
    res.json(gffftMemberToJson(membership))
  })


export default router
