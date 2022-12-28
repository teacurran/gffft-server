import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {deleteBookmark} from "../user_data"
import {DeleteBookmarkRequest} from "./delete_bookmark_request"

export const apiDeleteBookmark = async (req: ValidatedRequest<DeleteBookmarkRequest>, res: Response) => {
  const gid = req.body.gid

  const memberId = res.locals.iamUser.id

  await deleteBookmark(gid, memberId)
  res.sendStatus(204)
}
