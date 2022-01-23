import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"

import {WriteResult} from "@google-cloud/firestore"
import {addAdjective, addNoun, addVerb, usersCollection} from "./users/user_data"
import {gffftsCollection, gffftsStatsCollection} from "./gfffts/gffft_data"
import {pathToRef, Ref, ref, upset, value} from "typesaurus"
import {GffftAdminCounter, GffftAnonCounter,
  GffftMemberCounter, GffftOwnerCounter, GffftStats} from "./gfffts/gffft_models"
import moment from "moment"
import {boardsCollection, threadPostsCollection, threadsCollection} from "./boards/board_data"
import {BoardPostCounterWithAuthor, BoardThreadCounter, BoardThreadPostCounterNoAuthor,
  ThreadPostCounterWithAuthor} from "./boards/board_models"
import {User} from "./users/user_models"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

export const addNouns = functions.https.onRequest(async (req, res) => {
  console.log("addNouns()")
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addNoun(line.split(" ").reverse()[0]))
    })
    await Promise.all(writes).then(() => {
      return res.status(200).send("promise I'm done")
    })
  }
})

export const addVerbs = functions.https.onRequest(async (req, res) => {
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addVerb(line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})

export const addAdjectives = functions.https.onRequest(async (req, res) => {
  console.log("addAdjectives() called")
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addAdjective(line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})

async function updateCounter(ref: Ref<GffftStats>, type: string, changeValue: number) {
  switch (type) {
  case "owner":
    return upset<GffftOwnerCounter>(ref, {
      ownerCount: value("increment", changeValue),
    })
    break
  case "admin":
    await upset<GffftAdminCounter>(ref, {
      adminCount: value("increment", changeValue),
    })
    break
  case "member":
    await upset<GffftMemberCounter>(ref, {
      memberCount: value("increment", changeValue),
    })
    break
  case "anon":
    await upset<GffftAnonCounter>(ref, {
      anonCount: value("increment", changeValue),
    })
    break
  default:
    break
  }
}

export const gffftMemberCounter = functions.firestore
  .document("users/{userId}/gfffts/{gffftId}/members/{memberId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId
    const gffftId = context.params.gffftId
    const memberId = context.params.memberId

    console.log(`gffftMemberCounter trigger: userId:${userId} 
      gffftId:${gffftId} memberId:${memberId}`)


    // const userGfffts = gffftsCollection(userId)
    // const gffftRef = ref(userGfffts, gffftId)
    const gffftStats = gffftsStatsCollection([userId, gffftId])
    const totalsRef = ref(gffftStats, "totals")
    const todayRef = ref(gffftStats, moment().format("YYYY-MM-DD"))

    const beforeData = change.before.data()
    const afterData = change.after.data()

    if (!change.before.exists && afterData != null) {
      updateCounter(totalsRef, afterData.type, 1)
      updateCounter(todayRef, afterData.type, 1)
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      if (beforeData.type != afterData.type) {
        updateCounter(totalsRef, beforeData.type, -1)
        updateCounter(todayRef, beforeData.type, -1)

        updateCounter(totalsRef, afterData.type, 1)
        updateCounter(todayRef, afterData.type, 1)
      }
    } else if (!change.after.exists && beforeData) {
      updateCounter(totalsRef, beforeData.type, -1)
      updateCounter(todayRef, beforeData.type, -1)
    }

    return
  })

// eslint-disable-next-line max-len
// /users/HlUUDSu2j3BYUUt0uHuTJUsOsrSv/gfffts/oJbbvots5t8AtY7kyI0Y/boards/ZrCjFTcsfEv2OZDqUZJF/threads/mCsIk2PqYOEqqvzgm1UU
export const threadCreateCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/boards/{bid}/threads/{tid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const bid = context.params.bid

    const beforeData = change.before.data()
    const afterData = change.after.data()

    const users = usersCollection
    const gfffts = gffftsCollection(ref(users, uid))
    const boards = boardsCollection(ref(gfffts, gid))
    const boardRef = ref(boards, bid)

    if (!change.before.exists && afterData != null) {
      return upset<BoardThreadCounter>(boardRef, {
        threadCount: value("increment", 1),
        updatedAt: afterData.updatedAt,
      })
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      // do nithing for post updates
    } else if (!change.after.exists && beforeData) {
      if (beforeData.postCount) {
        return upset<BoardThreadPostCounterNoAuthor>(boardRef, {
          threadCount: value("increment", -1),
          postCount: value("increment", -beforeData.postCount),
        })
      }
    }

    return
  })


export const threadReplyCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/boards/{bid}/threads/{tid}/posts/{pid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const bid = context.params.bid
    const tid = context.params.tid

    console.log(`threadReplyCounter: uid:${uid} gid:${gid} bid:${tid} tid:${tid}`)

    const beforeData = change.before.data()
    const afterData = change.after.data()

    const users = usersCollection
    const gfffts = gffftsCollection(ref(users, uid))
    const boards = boardsCollection(ref(gfffts, gid))
    const boardRef = ref(boards, bid)
    const threads = threadsCollection(ref(boards, bid))

    if (!change.before.exists && afterData != null) {
      const authorRef = pathToRef<User>(afterData.author.path)
      await upset<ThreadPostCounterWithAuthor>(ref(threads, tid), {
        postCount: value("increment", 1),
        latestPost: authorRef,
        updatedAt: afterData.updatedAt,
      })
      return upset<BoardPostCounterWithAuthor>(boardRef, {
        postCount: value("increment", 1),
        latestPost: authorRef,
      })
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      // do nithing for post updates
    } else if (!change.after.exists && beforeData) {
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

    return
  })

