import * as BoardFactory from "./boards"
import * as GffftFactory from "./gfffts"
import * as GalleryFactory from "./galleries"
import * as GalleryItemFactory from "./gallery_items"
import * as LinkSetFactory from "./link_sets"

export const factories = {
  board: BoardFactory.default,
  gffft: GffftFactory.default,
  gallery: GalleryFactory.default,
  galleryItem: GalleryItemFactory.default,
  linkSet: LinkSetFactory.default,
}
