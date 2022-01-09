import {query, subcollection, where, limit, add, pathToRef, get} from "typesaurus"
import {Gallery} from "./gallery_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"

const DEFAULT_BOARD_KEY = "default"

export const galleryCollection = subcollection<Gallery, Gffft, User>("galleries", gffftsCollection)

/**
 * gets or creates the default gallery for a user
 * @param {string} userId
 * @param {string} gffftId
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultGallery(userId: string, gffftId: string): Promise<Gallery> {
  const userGalleries = galleryCollection([userId, gffftId])

  let gallery = await query(userGalleries, [
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
    } as Gallery
    const result = await add<Gallery>(userGalleries, gallery)
    gallery.id = result.id
  }

  return gallery
}

export async function getGalleryByRef(refId: string): Promise<Gallery | null> {
  return get(pathToRef<Gallery>(refId)).then((snapshot) => {
    if (snapshot != null) {
      const data = snapshot.data
      data.id = snapshot.ref.id
      return data
    }
    return null
  })
}
