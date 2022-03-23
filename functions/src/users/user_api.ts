import * as Joi from "@hapi/joi"
import express, {Request, Response} from "express"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {field, ref, remove, update, upset, value} from "typesaurus"
import {LoggedInUser, optionalAuthentication, requiredAuthentication} from "../auth"
import {getBoard, getBoardByRefString, getThread, getThreads, threadsCollection} from "../boards/board_data"
import {boardToJson, IBoardType, threadsToJson, threadToJson} from "../boards/board_interfaces"
import {Board} from "../boards/board_models"
import {getCalendarByRef} from "../calendars/calendar_data"
import {calendarToJson, ICalendarType} from "../calendars/calendar_interfaces"
import {resetMemberCounter} from "../counters/common"
import {
  galleryCollection,
  galleryItemsCollection,
  getGallery, getGalleryByRefString, getGalleryItem,
  getGalleryItems, hydrateGallery,
} from "../galleries/gallery_data"
import {galleryItemToJson, galleryToJson, galleryToJsonWithItems, IGalleryType} from "../galleries/gallery_interfaces"
import {Gallery} from "../galleries/gallery_models"
import {
  checkGffftHandle, createGffftMembership, deleteGffftMembership, getGffft,
  getGffftMembership,
  getOrCreateGffftMembership,
  gffftsCollection,
} from "../gfffts/gffft_data"
import {gffftToJson, IGffftFeatureRef} from "../gfffts/gffft_interfaces"
import {GffftMember, TYPE_OWNER} from "../gfffts/gffft_models"
import {getLinkSet, getLinkSetByRefString, getLinkSetItems, hydrateLinkSet} from "../link-sets/link_set_data"
import {ILinkSet, linkSetToJson, linkSetToJsonWithItems} from "../link-sets/link_set_interfaces"
import {LinkSet} from "../link-sets/link_set_models"
import {getNotebookByRef} from "../notebooks/notebook_data"
import {INotebookType, notebookToJson} from "../notebooks/notebook_interfaces"
import {Notebook} from "../notebooks/notebook_models"
import {
  createBookmark, deleteBookmark, getBookmark, getHydratedUserBookmarks,
  getUniqueUsername,
  getUser, usersCollection,
} from "./user_data"
import {bookmarksToJson, iamUserToJson} from "./user_interfaces"
import {User, UserBookmark, UsernameChange} from "./user_models"

// const userUpdateRequestParams = Joi.object({
//   uid: Joi.string().required(),
//   displayName: Joi.string().required(),
// })
// export interface UserUpdateRequest extends ValidatedRequestSchema {
//     [ContainerTypes.Body]: {
//       uid: string;
//       displayName: string;
//     };
//   }

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
    let gid = req.params.gid

    if (uid == "me") {
      if (iamUser == null) {
        res.status(403).send("Unauthorized: login required for 'me'")
        return
      } else {
        uid = iamUser.id
      }
    }

    const gffft = await getGffft(uid, gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const boards: Board[] = []
    const calendars: ICalendarType[] = []
    const galleries: Gallery[] = []
    const notebooks: Notebook[] = []
    const features: IGffftFeatureRef[] = []
    const linkSets: LinkSet[] = []

    if (gffft.features) {
      const featurePromises: Promise<void>[] = []
      for (let i=0; i<gffft.features.length; i++) {
        const feature = gffft.features[i]
        console.log(`looking at feature: ${feature}`)
        if (feature.indexOf("/boards/") != -1) {
          featurePromises.push(getBoardByRefString(feature).then((board) => {
            if (board) {
              boards.push(board)
              if (board.id) {
                features.push({
                  type: "board",
                  id: board.id,
                })
              }
            }
          }))
        } else if (feature.indexOf("/calendars/") != -1) {
          featurePromises.push(getCalendarByRef(feature).then((calendar) => {
            const calendarJson = calendarToJson(calendar)
            if (calendarJson != null) {
              calendars.push(calendarJson)
              features.push({
                type: "calendar",
                id: calendarJson.id,
              })
            }
          }))
        } else if (feature.indexOf("/galleries/") != -1) {
          featurePromises.push(getGalleryByRefString(feature).then((gallery) => {
            if (gallery) {
              galleries.push(gallery)
              features.push({
                type: "gallery",
                id: gallery.id,
              })
            }
          }))
        } else if (feature.indexOf("/notebooks/") != -1) {
          featurePromises.push(getNotebookByRef(feature).then((notebook) => {
            if (notebook) {
              notebooks.push(notebook)
              if (notebook.id) {
                features.push({
                  type: "notebook",
                  id: notebook.id,
                })
              }
            }
          }))
        } else if (feature.indexOf("/link-sets/") != -1) {
          featurePromises.push(getLinkSetByRefString(feature).then((item) => {
            if (item) {
              linkSets.push(item)
              if (item.id) {
                features.push({
                  type: "linkSet",
                  id: item.id,
                })
              }
            }
          }))
        } else if (feature == "fruitCode") {
          features.push({
            type: "fruitCode",
            id: "fruitCode",
          })
        }

        await Promise.all(featurePromises)
      }
    }

    const boardJson: IBoardType[] = []
    boards.forEach((board) => {
      const json = boardToJson(board)
      if (json != null) {
        boardJson.push(json)
      }
    })

    const notebookJson: INotebookType[] = []
    notebooks.forEach((notebook) => {
      const json = notebookToJson(notebook)
      if (json != null) {
        notebookJson.push(json)
      }
    })

    const galleryJson: IGalleryType[] = []
    galleries.forEach((gallery) => {
      const json = galleryToJson(gallery)
      if (json != null) {
        galleryJson.push(json)
      }
    })

    const linkSetJson: ILinkSet[] = []
    linkSets.forEach((linkSet) => {
      const json = linkSetToJson(linkSet)
      if (json != null) {
        linkSetJson.push(json)
      }
    })

    let membership: GffftMember | undefined
    let bookmark: UserBookmark | undefined
    let user: User | undefined
    if (iamUser != null) {
      membership = await getOrCreateGffftMembership(uid, gid, iamUser.id)
      bookmark = await getBookmark(uid, gid, iamUser.id)
      user = await getUser(iamUser.id)
    }

    res.json(gffftToJson(gffft, user, membership, bookmark, features,
      boardJson, calendars, galleryJson, notebookJson, linkSetJson))
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

    if (uid == "me") {
      if (iamUser) {
        uid = iamUser.id
      }
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

    // const iamUser: LoggedInUser = res.locals.iamUser
    // const gffft = await getGffft(uid, gid)
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
  validator.params(deleteBoardThreadsPathParams),
  async (req: ValidatedRequest<DeleteBoardThreadsRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const bid = req.params.bid
    const tid = req.params.tid

    if (uid == "me") {
      if (iamUser == null) {
        res.sendStatus(404)
        return
      }
      uid = iamUser.id
    }

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
    const itemPromise = getThread(uid, gid, bid, tid, "", 0)

    // make sure the gffft exists
    const gffft = await gffftPromise
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const item = await itemPromise
    if (!item) {
      res.sendStatus(404)
      return
    }

    const membership = await membershipPromise

    let canEdit = false
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
    return
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

    // const iamUser: LoggedInUser = res.locals.iamUser
    // const gffft = await getGffft(uid, gid)
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
  handle: Joi.string().optional().allow(null),
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

    if (!checkGffftHandle(uid, gid, memberId, handle)) {
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
    const iamUser: LoggedInUser = res.locals.iamUser
    let uid = req.body.uid
    let gid = req.body.gid

    const memberId = res.locals.iamUser.id

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

    await createBookmark(uid, gid, memberId)
    res.sendStatus(204)
  })

router.delete(
  "/me/bookmarks",
  requiredAuthentication,
  validator.body(createMemberParams),
  async (req: ValidatedRequest<CreateMemberRequest>, res: Response) => {
    const gid = req.body.gid

    const memberId = res.locals.iamUser.id

    await deleteBookmark(gid, memberId)
    res.sendStatus(204)
  })

router.post(
  "/me/change-username",
  requiredAuthentication,
  async (req: Request, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const userId = iamUser.id
    const user: User = await getUser(userId)
    user.username = await getUniqueUsername(false)

    user.updatedAt = new Date()
    await upset<UsernameChange>(usersCollection, userId, {
      username: user.username,
      usernameCounter: value("increment", 1),
      updatedAt: new Date(),
    })

    res.json(iamUserToJson(user))
  }
)

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

    // const gfffts = gffftsCollection(ref(usersCollection, uid))
    // `const galleries = galleryCollection(ref(gfffts, gid))
    // const galleryRef = ref(galleries, mid)
    // const galleryItems = galleryItemsCollection(galleryRef)

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
      res.sendStatus(404)
      return
    }

    await resetPhotoCounterPromise
    await resetVideoCounterPromise

    const items = await galleryItemsPromise

    const hydratedGallery = await hydrateGallery(gid, uid, gallery, items)
    if (hydratedGallery == null) {
      res.sendStatus(404)
      return
    }

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
  validator.params(getGalleryItemPathParams),
  validator.query(getGalleryQueryParams),
  async (req: ValidatedRequest<GetGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid
    const iid = req.params.iid

    if (uid == "me") {
      if (iamUser == null) {
        res.sendStatus(404)
        return
      }
      uid = iamUser.id
    }

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
    const itemPromise = getGalleryItem(uid, gid, mid, iid)

    // make sure the gffft exists
    const gffft = await gffftPromise
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

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
    return
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
  validator.params(getGalleryItemPathParams),
  validator.body(updateGalleryItemParams),
  async (req: ValidatedRequest<UpdateGalleryItemRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const mid = req.params.mid
    const iid = req.params.iid

    if (uid == "me") {
      if (iamUser == null) {
        res.sendStatus(404)
        return
      }
      uid = iamUser.id
    }

    const gffftPromise = getGffft(uid, gid)
    const membershipPromise = getGffftMembership(uid, gid, iamUser?.id)
    const itemPromise = getGalleryItem(uid, gid, mid, iid)

    // make sure the gffft exists
    const gffft = await gffftPromise
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

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

    const linkSet = await getLinkSet(uid, gid, lid)

    if (!linkSet) {
      res.sendStatus(404)
      return
    }

    await resetMemberCounter(iamUser, "linkSetItems", uid, gid)

    const items = await getLinkSetItems(uid, gid, lid, req.query.offset, req.query.max)

    const hydratedLinkSet = await hydrateLinkSet(uid, gid, linkSet, items)
    if (hydratedLinkSet == null) {
      res.sendStatus(404)
      return
    }

    res.json(linkSetToJsonWithItems(hydratedLinkSet))
  }
)

export default router

