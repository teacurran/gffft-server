import {WHO_OWNER} from "../boards/board_data"
import {notEmpty} from "../common/utils"
import {IUserRef} from "../users/user_interfaces"
import {Gallery, HydratedGallery, HydratedGalleryItem} from "./gallery_models"

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const mapToObj = (m: Map<string, string>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Array.from(m).reduce((obj: any, [key, value]) => {
    obj[key] = value
    return obj
  }, {})
}

export interface IGalleryItem {
    id: string
    author: IUserRef
    fileName: string
    filePath: string
    thumbnail: boolean
    urls: any
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
  gi: HydratedGalleryItem | null): IGalleryItem | null {
  if (gi == null || gi.id == null) {
    return null
  }
  const urls = new Map<string, string>()

  if (gi.urls) {
    for (let i=0; i<gi.urls.length; i++) {
      const url = gi.urls[i].replace("http://0.0.0.0", "http://127.0.0.1")
      if (url.indexOf("320x320") > -1) {
        urls.set("320", url)
      } else if (url.indexOf("640x640") > -1) {
        urls.set("640", url)
      } else if (url.indexOf("1024x1024") > -1) {
        urls.set("1024", url)
      } else {
        console.log(`not sure what to do with size: ${url}`)
      }
    }
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
    fileName: gi.fileName ?? "",
    filePath: gi.filePath ?? "",
    thumbnail: gi.thumbnail ?? false,
    urls: mapToObj(urls),
    createdAt: gi.createdAt,
  }
  return item
}


