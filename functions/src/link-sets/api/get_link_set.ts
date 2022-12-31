import {ContainerTypes, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {LoggedInUser} from "../../accounts/auth"
import {Response} from "express"
import {getGffft} from "../../gfffts/gffft_data"
import {getLinkSet, getLinkSetItems, hydrateLinkSet} from "../link_set_data"
import {resetMemberCounter} from "../../counters/common"
import {linkSetToJsonWithItems} from "../link_set_interfaces"
import Joi from "joi"

export const getLinkSetPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  lid: Joi.string().required(),
})
export const getLinkSetQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetLinkSetRequest extends ValidatedRequestSchema {
    [ContainerTypes.Params]: {
      uid: string
      gid: string
      lid: string
    }
    [ContainerTypes.Query]: {
      max?: number
      offset?: string
    };
  }

export const getLinkSetRequest = async (req: ValidatedRequest<GetLinkSetRequest>, res: Response) => {
  const iamUser: LoggedInUser | null = res.locals.iamUser

  let uid = req.params.uid
  let gid = req.params.gid
  let lid = req.params.lid

  if (uid == "me") {
    if (iamUser == null) {
      res.sendStatus(401)
      return
    }

    uid = iamUser.id
  }

  // make sure the gffft exists
  const gffft = await getGffft(uid, gid)
  if (!gffft) {
    res.sendStatus(404)
    return
  }
  gid = gffft.id

  const linkSet = await getLinkSet(uid, gid, lid)

  if (!linkSet) {
    res.sendStatus(404)
    return
  }
  lid = linkSet.id

  await resetMemberCounter(iamUser, "linkSetItems", uid, gid)

  const items = await getLinkSetItems(uid, gid, lid, req.query.offset, req.query.max)

  const hydratedLinkSet = await hydrateLinkSet(uid, gid, linkSet, items)

  res.json(linkSetToJsonWithItems(hydratedLinkSet))
}
