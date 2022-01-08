import express, {Request, Response} from "express"

import {getUser, iamUserToJson} from "./user_data"


// import {
//   ContainerTypes,
//   createValidator,
//   ValidatedRequestSchema,
// } from "express-joi-validation"
import {LoggedInUser, requiredAuthentication} from "../auth"
import {User} from "./user_models"
import {getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {getGffft, getOrCreateDefaultGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import Joi from "joi"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {gffftToJson} from "../gfffts/gffft_types"
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
    res.json(gffftToJson(gffft))
  }
)


export default router
