import * as Joi from "joi"
import express, {Request, Response} from "express"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {field, ref, remove, update, upset} from "typesaurus"
import {LoggedInUser, optionalAuthentication, requiredAuthentication, requiredGffftMembership} from "../accounts/auth"
import {getBoard, getThread, getThreads, threadsCollection} from "../boards/board_data"
import {threadsToJson, threadToJson} from "../boards/board_interfaces"
import {resetMemberCounter} from "../counters/common"
import {
  galleryCollection,
  galleryItemsCollection,
  getGallery, getGalleryItem,
  getGalleryItems, hydrateGallery,
} from "../galleries/gallery_data"
import {galleryItemToJson, galleryToJsonWithItems} from "../galleries/gallery_interfaces"
import {
  checkGffftHandle, createGffftMembership, deleteGffftMembership, getFullGffft, getGffft,
  getGffftMembership,
  gffftsCollection,
} from "../gfffts/gffft_data"
import {gffftToJson} from "../gfffts/gffft_interfaces"
import {GffftMember, TYPE_OWNER} from "../gfffts/gffft_models"
import {getLinkSet, getLinkSetItems, hydrateLinkSet} from "../link-sets/link_set_data"
import {linkSetToJsonWithItems} from "../link-sets/link_set_interfaces"
import {
  createBookmark, deleteBookmark, getHydratedUserBookmarks,
  getUser, usersCollection,
} from "./user_data"
import {bookmarksToJson, iamUserToJson} from "./user_interfaces"
import {User} from "./user_models"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.get(
  "/me",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const user: User = await getUser(userId)

    res.json(iamUserToJson(user))
  }
)

router.get(
  "/me/bookmarks",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const bookmarks = await getHydratedUserBookmarks(userId)

    res.json(bookmarksToJson(bookmarks))
  }
)


export const getGffftByIdParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
})
export interface GetGffftByIdRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string;
    gid: string;
  };
}

router.get(
  "/:uid/gfffts/:gid",
  optionalAuthentication,
  validator.params(getGffftByIdParams),
  async (req: ValidatedRequest<GetGffftByIdRequest>, res: Response) => {
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
)

export const getBoardThreadsPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
})
export const getBoardThreadsQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetBoardThreadsRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    bid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads",
  optionalAuthentication,
  validator.params(getBoardThreadsPathParams),
  validator.query(getBoardThreadsQueryParams),
  async (req: ValidatedRequest<GetBoardThreadsRequest>, res: Response) => {
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
)

export const deleteBoardThreadsPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
  tid: Joi.string().required(),
})
export interface DeleteBoardThreadsRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    bid: string
    tid: string
  }
}

router.delete(
  "/:uid/gfffts/:gid/boards/:bid/threads/:tid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(deleteBoardThreadsPathParams),
  async (req: ValidatedRequest<DeleteBoardThreadsRequest>, res: Response) => {
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

    const threadCollection = threadsCollection([uid, gid, bid])

    await update(threadCollection, tid, [
      field("deleted", true),
      field("deletedAt", new Date()),
    ])

    res.sendStatus(204)
  }
)

export const getThreadPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
  tid: Joi.string().required(),
})
export const getThreadQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetThreadsRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    bid: string
    tid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}

router.get(
  "/:uid/gfffts/:gid/boards/:bid/threads/:tid",
  optionalAuthentication,
  validator.params(getThreadPathParams),
  validator.query(getThreadQueryParams),
  async (req: ValidatedRequest<GetThreadsRequest>, res: Response) => {
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
)

const createMemberParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  handle: Joi.string(),
})
export interface CreateMemberRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    handle: string
  }
}

router.post(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
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
  })

router.delete(
  "/me/gfffts/membership",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const uid = req.body.uid
    const gid = req.body.gid
    const memberId = res.locals.iamUser.id

    await deleteGffftMembership(uid, gid, memberId)
    res.sendStatus(204)
  })

router.post(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
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
  })

const deleteBookmarkParams = Joi.object({
  gid: Joi.string().required(),
})
export interface DeleteBookmarkRequest extends ValidatedRequestSchema {
    [ContainerTypes.Body]: {
      gid: string
    }
  }
router.delete(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(deleteBookmarkParams),
  async (req: ValidatedRequest<DeleteBookmarkRequest>, res: Response) => {
    const gid = req.body.gid

    const memberId = res.locals.iamUser.id

    await deleteBookmark(gid, memberId)
    res.sendStatus(204)
  })

export const getGalleryPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
})
export const getGalleryQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetGalleryRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}

router.get(
  "/:uid/gfffts/:gid/galleries/:mid",
  optionalAuthentication,
  validator.params(getGalleryPathParams),
  validator.query(getGalleryQueryParams),
  async (req: ValidatedRequest<GetGalleryRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid

    if (uid == "me") {
      if (iamUser == null) {
        res.sendStatus(404)
        return
      }
      uid = iamUser.id
    }
    const posterUid = iamUser?.id

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = getGffftMembership(uid, gid, posterUid)
    const galleryPromise = getGallery(uid, gid, mid)
    const galleryItemsPromise = getGalleryItems(uid, gid, mid, req.query.offset, req.query.max, iamUser?.id)
    const resetPhotoCounterPromise = resetMemberCounter(iamUser, "galleryPhotos", uid, gid)
    const resetVideoCounterPromise = resetMemberCounter(iamUser, "galleryVideos", uid, gid)

    const gffft = await gffftPromise
    // make sure the gffft exists
    if (!gffft) {
      console.log(`gffft not found, gid: ${gid}`)
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const membership = await membershipPromise
    const gallery = await galleryPromise

    if (!gallery) {
      console.error(`gallery not found, uid: ${uid} gid: ${gid} mid: ${mid}`)
      res.sendStatus(404)
      return
    }

    await resetPhotoCounterPromise
    await resetVideoCounterPromise

    const items = await galleryItemsPromise

    const hydratedGallery = await hydrateGallery(uid, gid, gallery, items)

    res.json(galleryToJsonWithItems(hydratedGallery, iamUser, membership))
  }
)

export const getGalleryItemPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
  iid: Joi.string().required(),
})
export interface GetGalleryItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}

router.delete(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(getGalleryItemPathParams),
  validator.query(getGalleryQueryParams),
  async (req: ValidatedRequest<GetGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    const uid = res.locals.uid
    const gid = res.locals.gid

    const mid = req.params.mid
    const iid = req.params.iid

    const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
    const itemPromise = getGalleryItem(uid, gid, mid, iid)

    const item = await itemPromise
    if (!item) {
      res.sendStatus(404)
      return
    }

    const membership = await membershipPromise

    let canEdit = false
    if (item.author.id == iamUser.id) {
      canEdit = true
    }
    if (membership && membership.type == TYPE_OWNER) {
      canEdit = true
    }

    if (!canEdit) {
      res.status(403).send("user does not have permission to edit item")
      return
    }

    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const galleries = galleryCollection(ref(gfffts, gid))
    const galleryRef = ref(galleries, mid)
    const galleryItems = galleryItemsCollection(galleryRef)
    const itemRef = ref(galleryItems, iid)

    await remove(itemRef)

    res.sendStatus(204)
  }
)

const updateGalleryItemParams = Joi.object({
  description: Joi.string().optional().allow(null, ""),
})
export interface UpdateGalleryItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
  [ContainerTypes.Body]: {
    description?: string
  }
}

router.patch(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  requiredAuthentication,
  requiredGffftMembership,
  validator.params(getGalleryItemPathParams),
  validator.body(updateGalleryItemParams),
  async (req: ValidatedRequest<UpdateGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    const uid = res.locals.uid
    const gid = res.locals.gid

    const mid = req.params.mid
    const iid = req.params.iid

    const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
    const itemPromise = getGalleryItem(uid, gid, mid, iid)

    const item = await itemPromise
    if (!item) {
      res.sendStatus(404)
      return
    }

    const membership = await membershipPromise

    let canEdit = false
    if (item.author.id == iamUser.id) {
      canEdit = true
    }
    if (membership && membership.type == TYPE_OWNER) {
      canEdit = true
    }

    if (!canEdit) {
      res.status(403).send("user does not have permission to edit item")
      return
    }

    item.description = req.body.description

    const gfffts = gffftsCollection(ref(usersCollection, uid))

    const galleries = galleryCollection(ref(gfffts, gid))
    const galleryRef = ref(galleries, mid)
    const galleryItems = galleryItemsCollection(galleryRef)
    const itemRef = ref(galleryItems, iid)

    upset(itemRef, item)

    res.json(galleryItemToJson(iamUser, membership, item))
  }
)

router.get(
  "/:uid/gfffts/:gid/galleries/:mid/i/:iid",
  optionalAuthentication,
  validator.params(getGalleryItemPathParams),
  async (req: ValidatedRequest<GetGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid

    if (uid == "me") {
      if (iamUser == null) {
        res.sendStatus(404)
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

    let gffftMembership: GffftMember | undefined
    if (iamUser != null) {
      gffftMembership = await getGffftMembership(uid, gid, iamUser.id)
    }

    const gallery = await getGallery(uid, gid, mid)

    if (!gallery) {
      res.sendStatus(404)
      return
    }

    const item = await getGalleryItem(uid, gid, mid, req.params.iid)

    res.json(galleryItemToJson(iamUser, gffftMembership, item))
  }
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

