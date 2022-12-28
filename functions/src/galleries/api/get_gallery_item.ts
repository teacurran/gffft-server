import {ValidatedRequest} from "express-joi-validation"
import {GetGalleryRequest} from "./get_gallery_request"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getGffft, getGffftMembership} from "../../gfffts/gffft_data"
import {getGallery, getGalleryItems, hydrateGallery} from "../gallery_data"
import {resetMemberCounter} from "../../counters/common"
import {galleryToJsonWithItems} from "../gallery_interfaces"

export const getGalleryItemRequest = async (req: ValidatedRequest<GetGalleryRequest>, res: Response) => {
  const iamUser: LoggedInUser | null = res.locals.iamUser

  let uid = req.params.uid
  let gid = req.params.gid
  const mid = req.params.mid

  if (uid == "me") {
    if (iamUser == null) {
      res.sendStatus(404)
      return
    }
    uid = iamUser.id
  }
  const posterUid = iamUser?.id

  const gffftPromise = getGffft(uid, gid)
  const membershipPromise = getGffftMembership(uid, gid, posterUid)
  const galleryPromise = getGallery(uid, gid, mid)
  const galleryItemsPromise = getGalleryItems(uid, gid, mid, req.query.offset, req.query.max, iamUser?.id)
  const resetPhotoCounterPromise = resetMemberCounter(iamUser, "galleryPhotos", uid, gid)
  const resetVideoCounterPromise = resetMemberCounter(iamUser, "galleryVideos", uid, gid)

  const gffft = await gffftPromise
  // make sure the gffft exists
  if (!gffft) {
    console.log(`gffft not found, gid: ${gid}`)
    res.sendStatus(404)
    return
  }
  gid = gffft.id

  const membership = await membershipPromise
  const gallery = await galleryPromise

  if (!gallery) {
    console.error(`gallery not found, uid: ${uid} gid: ${gid} mid: ${mid}`)
    res.sendStatus(404)
    return
  }

  await resetPhotoCounterPromise
  await resetVideoCounterPromise

  const items = await galleryItemsPromise

  const hydratedGallery = await hydrateGallery(uid, gid, gallery, items)

  res.json(galleryToJsonWithItems(hydratedGallery, iamUser, membership))
}
