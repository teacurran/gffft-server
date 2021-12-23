import express, {Request, Response} from "express"

import * as firebaseAdmin from "firebase-admin"
import {getUser, iamUserToJson} from "./data"
import UserRecord = firebaseAdmin.auth.UserRecord;

// import {
//   ContainerTypes,
//   createValidator,
//   ValidatedRequestSchema,
// } from "express-joi-validation"
import {requiredAuthentication} from "../auth"
import {User} from "./models"
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
      const iamUser: UserRecord = res.locals.iamUser
      const user: User = await getUser(iamUser.uid)

      res.json(iamUserToJson(iamUser, user))
    }
)


export default router
