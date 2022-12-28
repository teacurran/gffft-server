import {ValidatedRequest} from "express-joi-validation"
import {CreateGffftMembershipRequest} from "./create_gffft_membership_request"
import {Response} from "express"
import {deleteGffftMembership} from "../gffft_data"

export const apiDeleteGffftMembership = async (req: ValidatedRequest<CreateGffftMembershipRequest>, res: Response) => {
  const uid = req.body.uid
  const gid = req.body.gid
  const memberId = res.locals.iamUser.id

  await deleteGffftMembership(uid, gid, memberId)
  res.sendStatus(204)
}
