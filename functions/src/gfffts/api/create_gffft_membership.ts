import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {checkGffftHandle, createGffftMembership} from "../gffft_data"
import {createBookmark} from "../../users/user_data"
import {CreateGffftMembershipRequest} from "./create_gffft_membership_request"

export const apiCreateGffftMembership = async (req: ValidatedRequest<CreateGffftMembershipRequest>, res: Response) => {
  const uid = req.body.uid
  const gid = req.body.gid
  const handle = req.body.handle
  const memberId = res.locals.iamUser.id

  if (!await checkGffftHandle(uid, gid, memberId, handle)) {
    res.status(400).send("handle exists")
  }

  await createGffftMembership(uid, gid, memberId, handle)
  await createBookmark(uid, gid, memberId)
  res.sendStatus(204)
}
