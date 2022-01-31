import {query, subcollection, where, limit, add, pathToRef, get, ref, Ref, Query,
  startAfter, order, Doc} from "typesaurus"
import {Gallery, GalleryItem, HydratedGallery, HydratedGalleryItem} from "./gallery_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {itemOrUndefined} from "../common/data"
import {usersCollection} from "../users/user_data"

const DEFAULT_BOARD_KEY = "default"

export const galleryCollection = subcollection<Gallery, Gffft, User>("galleries", gffftsCollection)
export const galleryItemsCollection = subcollection<GalleryItem, Gallery,
  Gffft, [string, string]>("items", galleryCollection)

/**
 * gets or creates the default gallery for a user
 * @param {string} uid
 * @param {string} gid
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultGallery(uid: string, gid: string): Promise<Gallery> {
  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const galleries = galleryCollection(ref(gfffts, gid))

  let gallery = await query(galleries, [
    where("key", "==", DEFAULT_BOARD_KEY),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      const value = results[0].data
      value.id = results[0].ref.id
      return value
    }
    return null
  })

  if (gallery == null) {
    gallery = {
      key: DEFAULT_BOARD_KEY,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Gallery
    const result = await add<Gallery>(galleries, gallery)
    gallery.id = result.id
  }

  return gallery
}

export async function getGallery(uid: string, gid: string, mid: string): Promise<Gallery | null> {
  if (gid == "default") {
    return getOrCreateDefaultGallery(uid, gid)
  }

  console.log(`looking for gallery: uid:${uid} gid:${gid} mid:${mid}`)
  const galleries = galleryCollection([uid, gid])
  const itemRef = ref(galleries, mid)
  console.log(`itemRef: ${JSON.stringify(itemRef)}`)
  return getGalleryByRef(itemRef)
}

export async function getGalleryByRef(itemRef: Ref<Gallery>): Promise<Gallery | null> {
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const data = snapshot.data
      data.id = snapshot.ref.id
      return data
    }
    return null
  })
}

export async function getGalleryByRefString(refId: string): Promise<Gallery | null> {
  const itemRef = pathToRef<Gallery>(refId)
  return getGalleryByRef(itemRef)
}

export async function getGalleryItems(uid: string,
  gid: string,
  mid:string,
  offset?: string,
  maxResults = 200): Promise<HydratedGalleryItem[]> {
  const galleryItems = galleryItemsCollection([uid, gid, mid])

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
      const hydratedItem = await hydrateGalleryItem(snapshot)
      if (hydratedItem != null) {
        items.push(hydratedItem)
      }
    }
    return items
  })
}

export async function hydrateGalleryItem(snapshot: Doc<GalleryItem> |
    GalleryItem |
    null): Promise<HydratedGalleryItem | null> {
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

  const authorUser = await get<User>(item.author).then((snapshot) => itemOrUndefined(snapshot))

  return {
    ...item,
    authorUser: authorUser,
  }
}

export async function hydrateGallery(gallery: Gallery,
  items: HydratedGalleryItem[]): Promise<HydratedGallery | null> {
  if (gallery == null) {
    return null
  }

  const latestPostUser = gallery.latestPost ?
    await get<User>(gallery.latestPost).then((snapshot) => itemOrUndefined(snapshot)) :
    undefined

  return {
    ...gallery,
    latestPostUser: latestPostUser,
    items: items,
  }
}

