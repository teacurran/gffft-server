import * as functions from "firebase-functions"
import {ref, upset, value} from "typesaurus"
import {gffftsCollection} from "../gfffts/gffft_data"
import {linkSetCollection} from "../link-sets/link_set_data"
import {LinkSetUpdateCounter} from "../link-sets/link_set_models"
import {usersCollection} from "../users/user_data"


export const linkSetItemCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/link-sets/{lid}/items/{iid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const lid = context.params.lid
    const iid = context.params.iid

    console.log(`linkSetItemCounter: uid:${uid} gid:${gid} mid:${lid} iid:${iid}`)

    const beforeData = change.before.data()
    const afterData = change.after.data()

    const users = usersCollection
    const gfffts = gffftsCollection(ref(users, uid))
    const linkSets = linkSetCollection(ref(gfffts, gid))

    const linkSetRef = ref(linkSets, lid)

    if (!change.before.exists && afterData != null) {
      return upset<LinkSetUpdateCounter>(linkSetRef, {
        itemCount: value("increment", 1),
        updatedAt: afterData.createdAt ? afterData.createdAt.toDate() : new Date(),
      })
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      // do nithing for post updates
    } else if (!change.after.exists && beforeData) {
      if (beforeData.postCount) {
        return upset<LinkSetUpdateCounter>(linkSetRef, {
          itemCount: value("increment", -1),
        })
      }
    }
    console.log("done")

    return
  })
