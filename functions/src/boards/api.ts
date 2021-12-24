import express, {Request, Response} from "express"

import * as firebaseAdmin from "firebase-admin"
import {getOrCreateDefaultBoard} from "./data"
import UserRecord = firebaseAdmin.auth.UserRecord

import {requiredAuthentication} from "../auth"
import {Board} from "./models"
import {boardToJson} from "./types"

// eslint-disable-next-line new-cap
const router = express.Router()
// const validator = createValidator()

router.get(
    "/default",
    requiredAuthentication,
    async (req: Request, res: Response) => {
      const iamUser: UserRecord = res.locals.iamUser
      const board: Board = await getOrCreateDefaultBoard(iamUser.uid)

      res.json(boardToJson(board))
    }
)


export default router

