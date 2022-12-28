import {ValidatedRequest} from "express-joi-validation"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getFullGffft} from "../gffft_data"
import {gffftToJson} from "../gffft_interfaces"
import {GetGffftByIdRequest} from "./get_gffft_request"

export const getGffftById = async (req: ValidatedRequest<GetGffftByIdRequest>, res: Response) => {
  const iamUser: LoggedInUser | null = res.locals.iamUser

  let uid = req.params.uid
  const gid = req.params.gid

  if (uid == "me") {
    if (iamUser == null) {
      res.status(403).send("Unauthorized: login required for 'me'")
      return
    }
    uid = iamUser.id
  }

  const gffft = await getFullGffft(uid, gid, iamUser?.id)
  if (!gffft) {
    res.sendStatus(404)
    return
  }

  res.json(gffftToJson(gffft))
}
