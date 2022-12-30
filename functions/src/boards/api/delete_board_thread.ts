import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getThread, getThreadCollection} from "../board_data"
import {TYPE_OWNER} from "../../gfffts/gffft_models"
import {field, update} from "typesaurus"
import {DeleteBoardThreadsRequest} from "./delete_board_thread_request"

export const deleteBoardThreads = async (req: ValidatedRequest<DeleteBoardThreadsRequest>, res: Response) => {
  const iamUser: LoggedInUser = res.locals.iamUser

  const uid = res.locals.uid
  const gid = res.locals.gid
  const bid = req.params.bid
  const tid = req.params.tid

  const item = await getThread(uid, gid, bid, tid, "", 0)
  if (!item) {
    res.sendStatus(404)
    return
  }

  const membership = res.locals.gffftMembership

  let canEdit = false
  console.log(`firstPost.id: ${item.firstPost.id} iamUser.id: ${iamUser.id}`)
  if (item.firstPost.id == iamUser.id) {
    canEdit = true
  }
  if (membership && membership.type == TYPE_OWNER) {
    canEdit = true
  }

  if (!canEdit) {
    res.status(403).send("user does not have permission to edit item")
    return
  }

  await update(getThreadCollection(uid, gid, bid), tid, [
    field("deleted", true),
    field("deletedAt", new Date()),
  ])

  res.sendStatus(204)
}
