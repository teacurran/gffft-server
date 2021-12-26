import express, {Request, Response} from "express"

import * as firebaseAdmin from "firebase-admin"
import {getOrCreateDefaultGffft} from "./data"
import UserRecord = firebaseAdmin.auth.UserRecord

import {requiredAuthentication} from "../auth"
import {Gffft} from "./models"
import {gffftToJson} from "./types"

// eslint-disable-next-line new-cap
const router = express.Router()
// const validator = createValidator()

router.get(
    "/default",
    requiredAuthentication,
    async (req: Request, res: Response) => {
      const iamUser: UserRecord = res.locals.iamUser
      const gffft: Gffft = await getOrCreateDefaultGffft(iamUser.uid)

      res.json(gffftToJson(gffft))
    }
)


export default router

