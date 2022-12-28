import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getGffft, getGffftMembership} from "../../gfffts/gffft_data"
import {getBoard, getThreads} from "../board_data"
import {resetMemberCounter} from "../../counters/common"
import {threadsToJson} from "../board_interfaces"
import {GetBoardThreadsRequest} from "./get_board_thread_request"

export const getBoardThreads = async (req: ValidatedRequest<GetBoardThreadsRequest>, res: Response) => {
  const iamUser: LoggedInUser | null = res.locals.iamUser

  let uid = req.params.uid
  let gid = req.params.gid
  const bid = req.params.bid

  if (uid == "me" && iamUser) {
    uid = iamUser.id
  }

  const gffftPromise = getGffft(uid, gid)
  const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
  const boardProomise = getBoard(uid, gid, bid)

  // make sure the gffft exists
  const gffft = await gffftPromise
  if (!gffft) {
    res.sendStatus(404)
    return
  }
  gid = gffft.id

  const board = await boardProomise

  if (!board) {
    res.sendStatus(404)
    return
  }

  const membership = await membershipPromise

  await resetMemberCounter(iamUser, "boardPosts", uid, gid)
  await resetMemberCounter(iamUser, "boardThreads", uid, gid)

  getThreads(uid, gid, bid, req.query.offset, req.query.max).then(
    (items) => {
      res.json(threadsToJson(iamUser, membership, items))
    }
  )
}
