import express, {Response} from "express"

import {threadPostsCollection, threadsCollection} from "./board_data"

import {LoggedInUser, requiredAuthentication} from "../accounts/auth"
import {Thread} from "./board_models"
import {getGffft} from "../gfffts/gffft_data"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {add, get, Ref, ref} from "typesaurus"
import {usersCollection} from "../users/user_data"
import * as Joi from "joi"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

const createPostParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  bid: Joi.string().required(),
  tid: Joi.string().optional().allow(null),
  subject: Joi.string().when("tid", {
    is: Joi.exist(),
    then: Joi.string().optional().allow(null),
    otherwise: Joi.string().required(),
  }),
  body: Joi.string().required(),
})

export interface CreatePostRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    bid: string
    tid?: string
    subject?: string
    body: string
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
    const bid = req.body.bid
    const tid = req.body.tid

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

    console.log(`creating post: uid:${uid} gid:${gid} bid:${bid} tid:${tid} subject: ${req.body.subject}`)

    const threads = threadsCollection([uid, gid, bid])

    let threadRef: Ref<Thread>
    const posterRef = ref(usersCollection, res.locals.iamUser.id)

    // are we replying to an existing thread
    if (tid) {
      threadRef = ref(threads, tid)
      const thread = await get(threadRef)

      // make sure the existing thread exists
      if (thread == null) {
        res.sendStatus(404)
        return
      }
    } else {
      const thread = {
        subject: req.body.subject,
        firstPost: posterRef,
        latestPost: posterRef,
        createdAt: new Date(),
        updatedAt: new Date(),
        postCount: 0,
        deleted: false,
      } as Thread

      threadRef = await add(threads, thread)
    }

    const postsCollection = threadPostsCollection(threadRef)

    await add(postsCollection, {
      author: posterRef,
      body: req.body.body,
      createdAt: new Date(),
      deleted: false,
    })

    res.sendStatus(204)
  }
)

export default router

