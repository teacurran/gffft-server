import express, {Response} from "express"

import {LoggedInUser, requiredAuthentication} from "../auth"
import {Post, PostType} from "./collection_models"
import {getGffft, gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, Ref, ref} from "typesaurus"
import {usersCollection} from "../users/user_data"
import * as Joi from "@hapi/joi"
import {getEnumValues} from "../common/utils"
import {collectionCollection, postCollection} from "./collection_data"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

const createPostParams = Joi.object({
  type: Joi.string().required().valid(getEnumValues(PostType)),
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  cid: Joi.string().required(),
  pid: Joi.string().optional().allow(null),
  subject: Joi.string().optional().allow(null),
  body: Joi.string().optional().allow(null)})
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

router.post(
  "/createPost",
  requiredAuthentication,
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

    // const gffft = await getGffft(uid, gid)
    // const board = await getBoard(uid, gid, bid)

    const gffftMembers = gffftsMembersCollection([uid, gid])

    // is this poster a member of the gffft?
    const posterUid = res.locals.iamUser.id
    const posterRef = ref(usersCollection, posterUid)

    const membershipDoc = await get(ref(gffftMembers, posterUid))
    if (!membershipDoc) {
      console.log("poster is not a member of this board")
      res.sendStatus(403)
      return
    }

    const membership = membershipDoc.data
    if (membership.type == TYPE_PENDING || membership.type == TYPE_REJECTED) {
      console.log("poster is not an approved member of this board")
      res.sendStatus(403)
      return
    }


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
        // todo, send more desriptive errors
        res.sendStatus(404)
        return
      }

      // todo: check for things like thread being locked, permissions, etc...
    } else {
      const item = {
        subject: req.body.subject,
        content: req.body.body,
        author: posterRef,
        latestReply: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        replyCount: 0,
        deleted: false,
      } as Post

      postRef = await add(posts, item)
    }

    // const postsCollection = postCollection(postRef)

    // await add(postsCollection, {
    //   author: posterRef,
    //   body: req.body.body,
    //   createdAt: new Date(),
    //   deleted: false,
    // })

    res.sendStatus(204)
  }
)

export default router

