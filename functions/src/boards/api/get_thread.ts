import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getGffft, getGffftMembership} from "../../gfffts/gffft_data"
import {getBoard, getThread} from "../board_data"
import {threadToJson} from "../board_interfaces"
import {GetThreadsRequest} from "./get_board_thread_request"

export const getThreadById = async (req: ValidatedRequest<GetThreadsRequest>, res: Response) => {
  const iamUser: LoggedInUser | null = res.locals.iamUser

  let uid = req.params.uid
  let gid = req.params.gid
  const bid = req.params.bid
  const tid = req.params.tid

  if (uid == "me") {
    if (iamUser == null) {
      res.status(403).send("Unauthorized: login required for 'me'")
      return
    } else {
      uid = iamUser.id
    }
  }

  const gffftPromise = getGffft(uid, gid)
  const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
  const boardPromise = getBoard(uid, gid, bid)

  // make sure the gffft exists
  const gffft = await gffftPromise
  if (!gffft) {
    res.sendStatus(404)
    return
  }
  gid = gffft.id

  const board = await boardPromise

  if (!board) {
    res.sendStatus(404)
    return
  }

  const membership = await membershipPromise

  getThread(uid, gid, bid, tid, req.query.offset, req.query.max).then(
    (thread) => {
      if (thread == null) {
        res.sendStatus(404)
        return
      }
      res.json(threadToJson(iamUser, membership, thread))
    }
  )
}
