import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {getGffft} from "../../gfffts/gffft_data"
import {createBookmark} from "../user_data"
import {CreateGffftMembershipRequest} from "../../gfffts/api/create_gffft_membership_request"

export const apiCreateBookmark = async (req: ValidatedRequest<CreateGffftMembershipRequest>, res: Response) => {
  const uid = req.body.uid
  let gid = req.body.gid

  const memberId = res.locals.iamUser.id

  // make sure the gffft exists
  const gffft = await getGffft(uid, gid)
  if (!gffft) {
    res.sendStatus(404)
    return
  }
  gid = gffft.id

  await createBookmark(uid, gid, memberId)
  res.sendStatus(204)
}
