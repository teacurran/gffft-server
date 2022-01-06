import express, {Request, Response} from "express"


import {getOrCreateDefaultBoard} from "./data"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {Board} from "./models"
import {boardToJson} from "./types"
import {getOrCreateDefaultGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"

// eslint-disable-next-line new-cap
const router = express.Router()
// const validator = createValidator()

router.get(
  "/default",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const gffft: Gffft = await getOrCreateDefaultGffft(userId)
    const board: Board = await getOrCreateDefaultBoard(userId, gffft.id)

    res.json(boardToJson(board))
  }
)

router.post(
  "/createPost",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const gffft: Gffft = await getOrCreateDefaultGffft(userId)
    const board: Board = await getOrCreateDefaultBoard(userId, gffft.id)

    res.json(boardToJson(board))
  }
)

export default router

