import * as functions from "firebase-functions"
import {ref, upset, value} from "typesaurus"
import {getGalleryCollection} from "../galleries/gallery_data"
import {GalleryUpdateCounter} from "../galleries/gallery_models"
import {incrementMemberCounter} from "./common"


export const galleryItemCounter = functions.firestore
  .document("users/{uid}/gfffts/{gid}/galleries/{mid}/items/{iid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid
    const gid = context.params.gid
    const mid = context.params.mid
    const iid = context.params.iid

    console.log(`galleryItemCounter: uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)

    const beforeData = change.before.data()
    const afterData = change.after.data()

    const galleries = getGalleryCollection(uid, gid)
    const galleryRef = ref(galleries, mid)

    if (!change.before.exists && afterData != null) {
      await incrementMemberCounter("galleryPhotos", uid, gid)
      return upset<GalleryUpdateCounter>(galleryRef, {
        photoCount: value("increment", 1),
        updatedAt: afterData.createdAt ? afterData.createdAt.toDate() : new Date(),
      })
    } else if (change.before.exists && change.after.exists && beforeData && afterData) {
      // do nothing for post updates
    } else if (!change.after.exists && beforeData) {
      return upset<GalleryUpdateCounter>(galleryRef, {
        photoCount: value("increment", -1),
      })
    }
    console.log("done")
  })
