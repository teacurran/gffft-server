import * as functions from "firebase-functions"
import moment from "moment"
import {getGffftStatsRef, updateCounter} from "../gfffts/gffft_data"

export const gffftMemberCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/members/{mid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const mid = context.params.mid

    console.log(`gffftMemberCounter trigger: userId:${uid} 
        gffftId:${gid} memberId:${mid}`)

    const totalsRef = getGffftStatsRef(uid, gid, "totals")
    const todayRef = getGffftStatsRef(uid, gid, moment().format("YYYY-MM-DD"))

    const beforeData = change.before.data()
    const afterData = change.after.data()

    if (!change.before.exists && afterData != null) {
      await(Promise.all([
        updateCounter(totalsRef, afterData.type, 1),
        updateCounter(todayRef, afterData.type, 1),
      ]))
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      if (beforeData.type != afterData.type) {
        await(Promise.all([
          updateCounter(totalsRef, beforeData.type, -1),
          updateCounter(todayRef, beforeData.type, -1),

          updateCounter(totalsRef, afterData.type, 1),
          updateCounter(todayRef, afterData.type, 1),
        ]))
      }
    } else if (!change.after.exists && beforeData) {
      await(Promise.all([
        updateCounter(totalsRef, beforeData.type, -1),
        updateCounter(todayRef, beforeData.type, -1),
      ]))
    }
  })
