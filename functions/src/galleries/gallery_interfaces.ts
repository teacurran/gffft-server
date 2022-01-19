import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {HydratedGallery, HydratedGalleryItem} from "./gallery_models"

export interface IGalleryItem {
    id: string
    author: IUserRef
    item: string
    createdAt: Date
}

export interface IGallery {
    id: string
    name?: string
    description?: string
    photoCount: number
    videoCount: number
    latestPost?: IUserRef
    createdAt: Date
    updatedAt: Date
    count: number
    items: IGalleryItem[]
}


export function galleryToJson(
  gallery: HydratedGallery
): IGallery {
  const itemsJson = gallery.items?.map((item) => galleryItemToJson(item)).filter(notEmpty)
  return {
    id: gallery.id,
    name: gallery.name,
    photoCount: gallery.photoCount,
    videoCount: gallery.videoCount,
    createdAt: gallery.createdAt,
    updatedAt: gallery.updatedAt,
    count: gallery.items?.length ?? 0,
    items: itemsJson ?? [],
  }
}

export function galleryItemToJson(
  gi: HydratedGalleryItem): IGalleryItem | null {
  if (gi == null || gi.id == null) {
    return null
  }
  const item: IGalleryItem = {
    id: gi.id,
    author: gi.authorUser ? {
      id: gi.authorUser.id,
      handle: gi.authorUser.username,
    } : {
      id: "deleted",
      handle: "deleted",
    },
    item: gi.item,
    createdAt: gi.createdAt,
  }
  return item
}


