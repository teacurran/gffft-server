import {WHO_OWNER} from "../boards/board_data"
import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {Gallery, HydratedGallery, HydratedGalleryItem} from "./gallery_models"

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
    count?: number
    whoCanView: string
    whoCanPost: string
    items?: IGalleryItem[]
}

export function galleryToJson(
  gallery: Gallery
): IGallery {
  return {
    id: gallery.id,
    name: gallery.name,
    photoCount: gallery.photoCount ?? 0,
    videoCount: gallery.videoCount ?? 0,
    createdAt: gallery.createdAt ?? new Date(),
    updatedAt: gallery.updatedAt ?? new Date(),
    whoCanView: gallery.whoCanView ?? WHO_OWNER,
    whoCanPost: gallery.whoCanPost ?? WHO_OWNER,
  }
}


export function galleryToJsonWithItems(
  gallery: HydratedGallery
): IGallery {
  const itemsJson = gallery.items?.map((item) => galleryItemToJson(item)).filter(notEmpty)
  return {
    id: gallery.id,
    name: gallery.name,
    photoCount: gallery.photoCount ?? 0,
    videoCount: gallery.videoCount ?? 0,
    createdAt: gallery.createdAt ?? new Date(),
    updatedAt: gallery.updatedAt ?? new Date(),
    count: gallery.items?.length ?? 0,
    items: itemsJson ?? [],
    whoCanView: gallery.whoCanView ?? WHO_OWNER,
    whoCanPost: gallery.whoCanPost ?? WHO_OWNER,
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


