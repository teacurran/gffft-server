import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"

import {WriteResult} from "@google-cloud/firestore"
import {addAdjective, addNoun, addVerb} from "./users/user_data"
import {gffftsStatsCollection} from "./gfffts/gffft_data"
import {Ref, ref, upset, value} from "typesaurus"
import {GffftAdminCounter, GffftAnonCounter,
  GffftMemberCounter, GffftOwnerCounter, GffftStats} from "./gfffts/gffft_models"
import moment from "moment"

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


    console.log(`trigger: userId:${userId} 
      gffftUd:${gffftId} memberId:${memberId}`)

    // const userGfffts = gffftsCollection(userId)
    // const gffftRef = ref(userGfffts, gffftId)
    const gffftStats = gffftsStatsCollection([userId, gffftId])
    const totalsRef = ref(gffftStats, "totals")
    const todayRef = ref(gffftStats, moment().format("YYYY-MM-DD"))

    if (!change.before.exists) {
      updateCounter(totalsRef, change.after.data()!.type, 1)
      updateCounter(todayRef, change.after.data()!.type, 1)
    } else if (change.before.exists && change.after.exists) {
      updateCounter(totalsRef, change.before.data()!.type, -1)
      updateCounter(totalsRef, change.after.data()!.type, 1)

      updateCounter(todayRef, change.before.data()!.type, -1)
      updateCounter(todayRef, change.after.data()!.type, 1)
    } else if (!change.after.exists) {
      updateCounter(totalsRef, change.before.data()!.type, -1)
      updateCounter(todayRef, change.before.data()!.type, -1)
    }

    return
  })


