import * as functions from "firebase-functions"
import {pathToRef, ref, upset, value} from "typesaurus"
import {boardsCollection, threadsCollection} from "../boards/board_data"
import {BoardPostCounterWithAuthor, ThreadPostCounterWithAuthor} from "../boards/board_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {usersCollection} from "../users/user_data"
import {User} from "../users/user_models"
import {incrementMemberCounter} from "./common"


export const threadReplyCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/boards/{bid}/threads/{tid}/posts/{pid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const bid = context.params.bid
    const tid = context.params.tid

    console.log(`threadReplyCounter: uid:${uid} gid:${gid} bid:${tid} tid:${tid}`)

    const oldPost = change.before.data()
    const newPost = change.after.data()

    const users = usersCollection
    const gfffts = gffftsCollection(ref(users, uid))
    const boards = boardsCollection(ref(gfffts, gid))
    const boardRef = ref(boards, bid)
    const threads = threadsCollection(ref(boards, bid))

    if (!change.before.exists && newPost != null) {
      await incrementMemberCounter("boardPosts", uid, gid)

      const authorRef = pathToRef<User>(newPost.author.path)
      await upset<ThreadPostCounterWithAuthor>(ref(threads, tid), {
        postCount: value("increment", 1),
        latestPost: authorRef,
        updatedAt: newPost.createdAt ? newPost.createdAt.toDate() : new Date(),
      })
      return upset<BoardPostCounterWithAuthor>(boardRef, {
        postCount: value("increment", 1),
        latestPost: authorRef,
        updatedAt: newPost.createdAt ? newPost.createdAt.toDate() : new Date(),
      })
    } else if (change.before.exists && change.after.exists && oldPost && newPost) {
      // do nithing for post updates
    } else if (!change.after.exists && oldPost) {
      // not updating the counts for post deletes right now
      // it may have conflicts with thread deleting
      // test out those two scenarios together.
      // await upset<ThreadPostCounter>(ref(threads, tid), {
      //   postCount: value("increment", -1),
      // })
      // return upset<BoardPostCounter>(boardRef, {
      //   postCount: value("increment", -1),
      // })
    }
  })


