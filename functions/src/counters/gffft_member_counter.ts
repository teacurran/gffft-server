import * as functions from "firebase-functions"
import moment from "moment"
import {ref} from "typesaurus"
import {gffftsCollection, gffftsStatsCollection} from "../gfffts/gffft_data"
import {usersCollection} from "../users/user_data"
import {updateCounter} from "./common"


export const gffftMemberCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/members/{mid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const mid = context.params.mid

    console.log(`gffftMemberCounter trigger: userId:${uid} 
        gffftId:${gid} memberId:${mid}`)

    const userGfffts = gffftsCollection(ref(usersCollection, uid))
    const gffftRef = ref(userGfffts, gid)
    const gffftStats = gffftsStatsCollection(gffftRef)
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
  })
