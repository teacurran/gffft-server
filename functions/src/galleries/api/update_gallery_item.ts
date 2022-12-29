import {ValidatedRequest} from "express-joi-validation"
import {UpdateGalleryItemRequest} from "./update_gallery_item_request"
import {Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {getGffftMembership, gffftsCollection} from "../../gfffts/gffft_data"
import {galleryCollection, galleryItemsCollection, getGalleryItem} from "../gallery_data"
import {TYPE_OWNER} from "../../gfffts/gffft_models"
import {ref, upset} from "typesaurus"
import {usersCollection} from "../../users/user_data"
import {galleryItemToJson} from "../gallery_interfaces"

export const updateGalleryItemRequest = async (req: ValidatedRequest<UpdateGalleryItemRequest>, res: Response) => {
  const iamUser: LoggedInUser = res.locals.iamUser

  const uid = res.locals.uid
  const gid = res.locals.gid

  const mid = req.params.mid
  const iid = req.params.iid

  const membershipPromise = getGffftMembership(uid, gid, iamUser.id)
  const itemPromise = getGalleryItem(uid, gid, mid, iid)

  console.log(`updateGalleryItemRequest: uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)

  const item = await itemPromise
  if (!item) {
    res.sendStatus(404)
    return
  }

  const membership = await membershipPromise

  let canEdit = false
  if (item.author.id == iamUser.id) {
    canEdit = true
  }
  if (membership && membership.type == TYPE_OWNER) {
    canEdit = true
  }

  if (!canEdit) {
    res.status(403).send("user does not have permission to edit item")
    return
  }

  item.description = req.body.description

  const gfffts = gffftsCollection(ref(usersCollection, uid))

  const galleries = galleryCollection(ref(gfffts, gid))
  const galleryRef = ref(galleries, mid)
  const galleryItems = galleryItemsCollection(galleryRef)
  const itemRef = ref(galleryItems, iid)

  upset(itemRef, item)

  res.json(galleryItemToJson(iamUser, membership, item))
}
