import {Ref} from "typesaurus"
import {User} from "../users/user_models"

export type Gallery = {
    id: string,
    key: string,
    name?: string,
    description?: string
    photoCount: number
    videoCount: number
    latestPost: Ref<User>
    createdAt: Date
    updatedAt: Date
  }

export interface HydratedGallery extends Gallery {
  latestPostUser: User | undefined
  items?: HydratedGalleryItem[]
}

export type GalleryItem = {
  id: string
  author: Ref<User>
  item: string
  createdAt: Date
}

export interface HydratedGalleryItem extends GalleryItem {
  authorUser: User | undefined
}
