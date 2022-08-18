import express, {Response} from "express"

import {LoggedInUser, optionalAuthentication, requiredAuthentication, requiredGffftMembership} from "../accounts/auth"
import {collectionCollection, Post, postCollection} from "./collection_models"
import {getGffft, getGffftMembership, gffftsCollection} from "../gfffts/gffft_data"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, Ref, ref} from "typesaurus"
import {usersCollection} from "../users/user_data"
import * as Joi from "joi"
import {getEnumValues} from "../common/utils"
import {getCollection, getPosts, hydrateCollection, resetCollectionUpdate} from "./collection_data"
import {collectionToJsonWithItems} from "./collection_interfaces"
import {PostType} from "../posts/post_type"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

const createPostParams = Joi.object({
  type: Joi.string().required().valid(getEnumValues(PostType)),
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  cid: Joi.string().required(),
  pid: Joi.string().optional().allow(null, ""),
  subject: Joi.string().optional().allow(null, ""),
  body: Joi.string().optional().allow(null, ""),
})

export interface CreatePostRequest extends ValidatedRequestSchema {
    [ContainerTypes.Body]: {
        type: PostType
        uid: string
        gid: string
        cid: string
        pid?: string
        subject?: string
        body?: string
    }
}

export const getCollectionPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  cid: Joi.string().required(),
})
export const getCollectionQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})

export interface GetCollectionRequest extends ValidatedRequestSchema {
    [ContainerTypes.Params]: {
        uid: string
        gid: string
        cid: string
    }
    [ContainerTypes.Query]: {
        max?: number
        offset?: string
    };
}

router.get(
  "/:uid/g/:gid/c/:cid",
  optionalAuthentication,
  validator.params(getCollectionPathParams),
  validator.query(getCollectionQueryParams),
  async (req: ValidatedRequest<GetCollectionRequest>, res: Response) => {
    const iamUser: LoggedInUser | null = res.locals.iamUser

    let uid = req.params.uid
    let gid = req.params.gid
    const cid = req.params.cid

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
    const collectionPromise = getCollection(uid, gid, cid)
    const postsPromise = getPosts(uid, gid, cid, req.query.offset, req.query.max, iamUser?.id)

    const resetCounterPromise = resetCollectionUpdate(uid, gid, cid, posterUid)

    const gffft = await gffftPromise
    // make sure the gffft exists
    if (!gffft) {
      console.log(`gffft not found, gid: ${gid}`)
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    const membership = await membershipPromise
    const collection = await collectionPromise

    if (!collection) {
      res.sendStatus(404)
      return
    }

    await resetCounterPromise
    const items = await postsPromise

    const hc = await hydrateCollection(uid, gid, collection, items)
    if (hc == null) {
      res.sendStatus(404)
      return
    }

    res.json(collectionToJsonWithItems(hc, iamUser, membership))
  }
)

router.post(
  "/createPost",
  requiredAuthentication,
  requiredGffftMembership,
  validator.body(createPostParams),
  async (req: ValidatedRequest<CreatePostRequest>, res: Response) => {
    const iamUser: LoggedInUser = res.locals.iamUser

    let uid = req.body.uid
    let gid = req.body.gid
    const cid = req.body.cid
    const pid = req.body.pid

    if (uid == "me") {
      uid = iamUser.id
    }

    // make sure the gffft exists
    const gffft = await getGffft(uid, gid)
    if (!gffft) {
      res.sendStatus(404)
      return
    }
    gid = gffft.id

    console.log(`creating post: uid:${uid} gid:${gid} cid:${cid} pid:${pid} subject: ${req.body.subject}`)

    // make sure the collection exists
    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const collections = collectionCollection(ref(gfffts, gid))
    const collectionRef = ref(collections, cid)
    const posts = postCollection(collectionRef)

    let postRef: Ref<Post>

    // are we replying to an existing thread
    if (pid) {
      postRef = ref(posts, pid)
      const post = await get(postRef)

      // make sure the existing thread exists
      if (post == null) {
        res.sendStatus(404)
        return
      }
    } else {
      const item = {
        subject: req.body.subject,
        content: req.body.body,
        author: ref(usersCollection, res.locals.iamUser.id),
        latestReply: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        replyCount: 0,
        deleted: false,
      } as Post

      await add(posts, item)
    }

    res.sendStatus(204)
  }
)

export default router

