import {query, subcollection, where, limit, add, pathToRef, get, ref, Ref, Query,
  startAfter, order, Doc, Collection} from "typesaurus"
import {Gallery, GalleryItem, HydratedGallery, HydratedGalleryItem} from "./gallery_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {getGffftRef, getGffftUser, gffftsCollection} from "../gfffts/gffft_data"
import {usersCollection} from "../users/user_data"
import {itemOrNull} from "../common/data"

export const COLLECTION_GALLERIES = "galleries"
export const DEFAULT_GALLERY_KEY = "default"

export const galleryCollection = subcollection<Gallery, Gffft, User>(COLLECTION_GALLERIES, gffftsCollection)
export const galleryItemsCollection = subcollection<GalleryItem, Gallery,
  Gffft, [string, string]>("items", galleryCollection)

/**
 * gets or creates the default gallery for a user
 * @param {string} uid
 * @param {string} gid
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultGallery(uid: string, gid: string): Promise<Gallery> {
  const galleries = getGalleryCollection(uid, gid)

  let gallery = await query(galleries, [
    where("key", "==", DEFAULT_GALLERY_KEY),
    limit(1),
  ]).then(itemOrNull)

  if (gallery == null) {
    gallery = {
      key: DEFAULT_GALLERY_KEY,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Gallery
    const result = await add<Gallery>(galleries, gallery)
    gallery.id = result.id
  }

  return gallery
}

export async function getGallery(uid: string, gid: string, mid: string): Promise<Gallery | null> {
  if (mid == "default") {
    return getOrCreateDefaultGallery(uid, gid)
  }

  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const galleries = galleryCollection(ref(gfffts, gid))
  const itemRef = ref(galleries, mid)
  return getGalleryByRef(itemRef)
}

export function getGalleryCollection(uid: string, gid: string): Collection<Gallery> {
  return galleryCollection(getGffftRef(uid, gid))
}

export function getGalleryItemsCollection(uid: string, gid: string, mid: string): Collection<GalleryItem> {
  return galleryItemsCollection(getGalleryRef(uid, gid, mid))
}

export function getGalleryItemRef(uid: string, gid: string, mid: string, iid: string): Ref<GalleryItem> {
  return ref(getGalleryItemsCollection(uid, gid, mid), iid)
}

export function getGalleryRef(uid: string, gid: string, mid: string): Ref<Gallery> {
  return ref(getGalleryCollection(uid, gid), mid)
}

export async function getGalleryByRef(itemRef: Ref<Gallery>): Promise<Gallery | null> {
  return get(itemRef).then(itemOrNull)
}

export async function getGalleryByRefString(refId: string): Promise<Gallery | null> {
  const itemRef = pathToRef<Gallery>(refId)
  return getGalleryByRef(itemRef)
}

export async function getGalleryItem(uid: string,
  gid: string,
  mid:string,
  iid:string): Promise<HydratedGalleryItem|null> {
  const galleryItems = getGalleryItemsCollection(uid, gid, mid)

  const item = await get(galleryItems, iid)
  return hydrateGalleryItem(uid, gid, item)
}

export async function getGalleryItems(uid: string,
  gid: string,
  mid:string,
  offset?: string,
  maxResults = 200,
  currentUid?: string): Promise<HydratedGalleryItem[]> {
  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const galleries = galleryCollection(ref(gfffts, gid))
  const galleryRef = ref(galleries, mid)
  const galleryItems = galleryItemsCollection(galleryRef)

  const queries: Query<GalleryItem, keyof GalleryItem>[] = []
  if (offset) {
    queries.push(order("createdAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("createdAt", "desc"))
  }
  queries.push(limit(maxResults))

  const items: HydratedGalleryItem[] = []
  return query(galleryItems, queries).then(async (results) => {
    for (const snapshot of results) {
      const hydratedItem = await hydrateGalleryItem(uid, gid, snapshot, currentUid)
      if (hydratedItem != null) {
        items.push(hydratedItem)
      }
    }
    return items
  })
}

export async function hydrateGalleryItem(uid: string, gid: string, snapshot: Doc<GalleryItem> |
    GalleryItem |
    null,
currentUid?: string): Promise<HydratedGalleryItem | null> {
  let item: GalleryItem

  if (snapshot == null) {
    return null
  }
  if ((snapshot as Doc<GalleryItem>).data) {
    item = (snapshot as Doc<GalleryItem>).data
    item.id = (snapshot as Doc<GalleryItem>).ref.id
  } else {
    item = (snapshot as GalleryItem)
  }

  const gffftMember = await getGffftUser(uid, gid, item.author)

  let liked = false

  if (currentUid && item.likes) {
    const itemIndex = item.likes.indexOf(currentUid, 0)
    if (itemIndex > -1) {
      liked = true
    }
  }

  return {
    ...item,
    authorUser: gffftMember == null ? undefined : gffftMember,
    liked,
  }
}

export async function hydrateGallery(uid: string, gid: string, gallery: Gallery,
  items: HydratedGalleryItem[]): Promise<HydratedGallery> {
  const latestPostUser = await getGffftUser(uid, gid, gallery.latestPost)

  return {
    ...gallery,
    latestPostUser: latestPostUser == null ? undefined : latestPostUser,
    items: items,
  }
}

