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
import {getOrCreateDefaultGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
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
// const validator = createValidator()

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

export default router
