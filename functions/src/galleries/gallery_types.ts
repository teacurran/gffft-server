import {Gallery} from "./gallery_models"

export interface IGalleryType {
    id: string
    name?: string
    description?: string
  }

export function notebookToJson(
  gallery: Gallery,
): IGalleryType | null {
  if (gallery == null) {
    return null
  }
  const item: IGalleryType = {
    id: gallery.id,
    name: gallery.name,
    description: gallery.description,
  }
  return item
}

