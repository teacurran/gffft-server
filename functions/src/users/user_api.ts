import * as Joi from "joi"
import express, {Response} from "express"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {LoggedInUser, optionalAuthentication, requiredAuthentication, requiredGffftMembership} from "../accounts/auth"
import {resetMemberCounter} from "../counters/common"
import {getGffft} from "../gfffts/gffft_data"
import {getLinkSet, getLinkSetItems, hydrateLinkSet} from "../link-sets/link_set_data"
import {linkSetToJsonWithItems} from "../link-sets/link_set_interfaces"
import {getGalleryItemPathParams} from "../galleries/api/get_gallery_item_request"
import {getGalleryPathParams, getGalleryQueryParams} from "../galleries/api/get_gallery_request"
import {getGalleryItemRequest} from "../galleries/api/get_gallery_item"
import {deleteGalleryItemRequest} from "../galleries/api/delete_gallery_item"
import {updateGalleryItemParams} from "../galleries/api/update_gallery_item_request"
import {updateGalleryItemRequest} from "../galleries/api/update_gallery_item"
import {getMe, getMeBookmarks} from "./api/get_me"
import {getGffftById} from "../gfffts/api/get_gffft"
import {getGffftByIdParams} from "../gfffts/api/get_gffft_request"
import {getBoardThreads} from "../boards/api/get_board_thread"
import {
  getBoardThreadsPathParams,
  getBoardThreadsQueryParams, getThreadPathParams,
  getThreadQueryParams,
} from "../boards/api/get_board_thread_request"
import {deleteBoardThreads} from "../boards/api/delete_board_thread"
import {deleteBoardThreadsPathParams} from "../boards/api/delete_board_thread_request"
import {getThreadById} from "../boards/api/get_thread"
import {apiCreateGffftMembership} from "../gfffts/api/create_gffft_membership"
import {
  createGffftMembershipParams,
} from "../gfffts/api/create_gffft_membership_request"
import {apiDeleteGffftMembership} from "../gfffts/api/delete_gffft_membership"
import {apiCreateBookmark} from "./api/create_bookmark"
import {deleteBookmarkParams} from "./api/delete_bookmark_request"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.get(
  "/me",
  requiredAuthentication,
  getMe
)

router.get(
  "/me/bookmarks",
  requiredAuthentication,
  getMeBookmarks
)

router.get(
  "/:uid/gfffts/:gid",
  optionalAuthentication,
  validator.params(getGffftByIdParams),
  getGffftById
)

router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads",
  optionalAuthentication,
  validator.params(getBoardThreadsPathParams),
  validator.query(getBoardThreadsQueryParams),
  getBoardThreads
)

router.delete(
  "/:uid/gfffts/:gid/boards/:bid/threads/:tid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(deleteBoardThreadsPathParams),
  deleteBoardThreads
)

router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads/:tid",
  optionalAuthentication,
  validator.params(getThreadPathParams),
  validator.query(getThreadQueryParams),
  getThreadById
)

router.post(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createGffftMembershipParams),
  apiCreateGffftMembership
)

router.delete(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createGffftMembershipParams),
  apiDeleteGffftMembership
)

router.post(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(createGffftMembershipParams),
  apiCreateBookmark
)

router.delete(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(deleteBookmarkParams),
)

router.get(
  "/:uid/gfffts/:gid/galleries/:mid",
  optionalAuthentication,
  validator.params(getGalleryPathParams),
  validator.query(getGalleryQueryParams),
  getGalleryItemRequest
)

router.delete(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(getGalleryItemPathParams),
  validator.query(getGalleryQueryParams),
  deleteGalleryItemRequest
)

router.patch(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(getGalleryItemPathParams),
  validator.body(updateGalleryItemParams),
  updateGalleryItemRequest
)

router.get(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  optionalAuthentication,
  validator.params(getGalleryItemPathParams),
  getGalleryItemRequest
)

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

router.get(
  "/:uid/gfffts/:gid/links/:lid",
  optionalAuthentication,
  validator.params(getLinkSetPathParams),
  validator.query(getLinkSetQueryParams),

  async (req: ValidatedRequest<GetLinkSetRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const lid = req.params.lid

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

    await resetMemberCounter(iamUser, "linkSetItems", uid, gid)

    const items = await getLinkSetItems(uid, gid, lid, req.query.offset, req.query.max)

    const hydratedLinkSet = await hydrateLinkSet(uid, gid, linkSet, items)

    res.json(linkSetToJsonWithItems(hydratedLinkSet))
  }
)

export default router

