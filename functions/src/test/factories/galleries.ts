import {Factory} from "fishery"
import {set} from "typesaurus"
import {DEFAULT_GALLERY_KEY, getGalleryRef} from "../../galleries/gallery_data"
import {Gallery} from "../../galleries/gallery_models"

type GalleryTransientParams = {
  uid: string
  gid: string
};

export default Factory.define<Gallery, GalleryTransientParams>(({transientParams, sequence, onCreate}) => {
  onCreate(async (item) => {
    if (transientParams.uid && transientParams.gid) {
      await set<Gallery>(getGalleryRef(transientParams.uid, transientParams.gid, id), item)
    }

    return item
  })

  const id = sequence.toString()
  const gallery: Gallery = {
    id: id,
    key: DEFAULT_GALLERY_KEY,
    createdAt: new Date(),
    updatedAt: new Date(),
    photoCount: 0,
    videoCount: 0,
  }

  return gallery
})

