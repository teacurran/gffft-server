import * as functions from "firebase-functions"
import {ref, upset, value} from "typesaurus"
import {boardsCollection} from "../boards/board_data"
import {BoardThreadCounter, BoardThreadPostCounterNoAuthor} from "../boards/board_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {incrementMemberCounter} from "./common"

// eslint-disable-next-line max-len
// /users/HlUUDSu2j3BYUUt0uHuTJUsOsrSv/gfffts/oJbbvots5t8AtY7kyI0Y/boards/ZrCjFTcsfEv2OZDqUZJF/threads/mCsIk2PqYOEqqvzgm1UU
export const threadCreateCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/boards/{bid}/threads/{tid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const bid = context.params.bid

    const beforeData = change.before.data()
    const newThread = change.after.data()

    const gfffts = gffftsCollection(uid)
    const boards = boardsCollection(ref(gfffts, gid))

    if (!change.before.exists && newThread != null) {
      await incrementMemberCounter("boardThreads", uid, gid)
      return upset<BoardThreadCounter>(boards, bid, {
        threadCount: value("increment", 1),
        updatedAt: newThread.createdAt ? newThread.createdAt.toDate() : new Date(),
      })
    } else if (change.before.exists && change.after.exists && beforeData && newThread) {
      // do nithing for post updates
    } else if (!change.after.exists && beforeData) {
      if (beforeData.postCount) {
        return upset<BoardThreadPostCounterNoAuthor>(boards, bid, {
          threadCount: value("increment", -1),
          postCount: value("increment", -beforeData.postCount),
        })
      }
    }
  })
