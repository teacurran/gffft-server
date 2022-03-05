import {Ref} from "typesaurus"
import {HydratedUser, User} from "../users/user_models"

export type Gallery = {
    id: string,
    key: string,
    name?: string,
    description?: string
    photoCount: number
    videoCount: number
    whoCanView?: string
    whoCanPost?: string
    latestPost: Ref<User>
    createdAt: Date
    updatedAt: Date
  }

export type GalleryUpdateCounter = {
    photoCount: number
    updatedAt?: Date
  }

export interface HydratedGallery extends Gallery {
  latestPostUser: HydratedUser | undefined
  items?: HydratedGalleryItem[]
}

export type GalleryItem = {
  id: string
  author: Ref<User>
  fileName: string
  filePath: string
  thumbnail: boolean
  createdAt: Date
  urls?: Array<string>
}

export interface HydratedGalleryItem extends GalleryItem {
  authorUser: HydratedUser | undefined
}

export type GalleryItemThumbnail = {
  thumbnail: boolean
  urls: Array<string>
}
