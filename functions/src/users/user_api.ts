import express, {Request, Response} from "express"

import {getUser, iamUserToJson} from "./user_data"


// import {
//   ContainerTypes,
//   createValidator,
//   ValidatedRequestSchema,
// } from "express-joi-validation"
import {LoggedInUser, requiredAuthentication} from "../auth"
import {User} from "./user_models"
import {getBoardByRef, getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {getGffft, getOrCreateDefaultGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import Joi from "joi"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {gffftToJson, IGffftFeatureRef} from "../gfffts/gffft_types"
import {getGalleryByRef} from "../galleries/gallery_data"
import {Calendar} from "../calendars/calendar_models"
import {Gallery} from "../galleries/gallery_models"
import {Notebook} from "../notebooks/notebook_models"
import {getCalendarByRef} from "../calendars/calendar_data"
import {boardToJson, IBoardType} from "../boards/board_types"
import {getNotebookByRef} from "../notebooks/notebook_data"
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

export const getByIdParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
})
export interface GetByIdRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string;
    gid: string;
  };
}

router.get(
  "/:uid/gfffts/:gid",
  requiredAuthentication,
  validator.params(getByIdParams),
  async (req: ValidatedRequest<GetByIdRequest>, res: Response) => {
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
          const board = await getBoardByRef(feature)
          if (board) {
            console.log(`boardXX:${JSON.stringify(board)}`)
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
    console.log(`boardJson:${JSON.stringify(boardJson)} boards: ${JSON.stringify(boards)}`)

    res.json(gffftToJson(gffft, features, boardJson, calendars, galleries, notebooks))
  }
)


export default router
