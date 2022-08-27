import * as functions from "firebase-functions"
import moment from "moment"
import {updateCounter} from "../gfffts/gffft_data"

export const gffftMemberCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/members/{mid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const mid = context.params.mid

    console.log(`gffftMemberCounter trigger: userId:${uid}
        gffftId:${gid} memberId:${mid}`)

    const totalsCounterName = "totals"
    const todayCounterName = moment().format("YYYY-MM-DD")

    const beforeData = change.before.data()
    const afterData = change.after.data()

    if (!change.before.exists && afterData != null) {
      await Promise.all([
        updateCounter(uid, gid, totalsCounterName, afterData.type, 1),
        updateCounter(uid, gid, todayCounterName, afterData.type, 1),
      ])
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      if (beforeData.type != afterData.type) {
        await Promise.all([
          updateCounter(uid, gid, totalsCounterName, beforeData.type, -1),
          updateCounter(uid, gid, todayCounterName, beforeData.type, -1),

          updateCounter(uid, gid, totalsCounterName, afterData.type, 1),
          updateCounter(uid, gid, todayCounterName, afterData.type, 1),
        ])
      }
    } else if (!change.after.exists && beforeData) {
      await Promise.all([
        updateCounter(uid, gid, totalsCounterName, beforeData.type, -1),
        updateCounter(uid, gid, todayCounterName, beforeData.type, -1),
      ])
    }
  })
