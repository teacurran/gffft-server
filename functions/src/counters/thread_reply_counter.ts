import * as functions from "firebase-functions"
import {get, Ref, ref, upset, value, ValueIncrement} from "typesaurus"
import {getBoardCollection, getBoardRef, threadsCollection} from "../boards/board_data"
import {BoardPostCounter, BoardPostCounterWithAuthor, Thread, ThreadPostCounter, ThreadPostCounterWithAuthor} from "../boards/board_models"
import {User} from "../users/user_models"
import {incrementMemberCounter} from "./common"

const incrementValue = (setValue: number): ValueIncrement => {
  return value("increment", setValue)
}

export const threadReplyCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/boards/{bid}/threads/{tid}/posts/{pid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const bid = context.params.bid
    const tid = context.params.tid

    console.log(`threadReplyCounter: uid:${uid} gid:${gid} bid:${bid} tid:${tid}`)

    const oldPost = change.before.data()
    const newPost = change.after.data()

    const boardRef = getBoardRef(uid, gid, bid)
    const boards = getBoardCollection(uid, gid)
    const threads = threadsCollection(ref(boards, bid))

    if (!change.before.exists && newPost != null) {
      const authorRef = newPost.author as Ref<User>
      await get<Thread>(threads, tid).then(async (item) => {
        if (item == null) {
          console.log("invalid tid, skipping")
          return
        }

        await incrementMemberCounter("boardPosts", uid, gid)
        return upset<ThreadPostCounterWithAuthor>(threads, tid, {
          postCount: incrementValue(1),
          latestPost: authorRef,
          updatedAt: newPost.createdAt,
        })
      })
      return upset<BoardPostCounterWithAuthor>(boardRef, {
        postCount: incrementValue(1),
        latestPost: authorRef,
        updatedAt: newPost.createdAt,
      })
    } else if (!change.after.exists && oldPost) {
      await get<Thread>(threads, tid).then((item) => {
        if (item == null) {
          console.log("invalid tid, skipping")
          return
        }
        return upset<ThreadPostCounter>(ref(threads, tid), {
          postCount: incrementValue(-1),
        })
      })
      return upset<BoardPostCounter>(boardRef, {
        postCount: incrementValue(-1),
      })
    }
  })


