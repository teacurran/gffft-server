import {Factory} from "fishery"
import {set, ref} from "typesaurus"
import {getGalleryItemRef} from "../../galleries/gallery_data"
import {GalleryItem} from "../../galleries/gallery_models"
import {usersCollection} from "../../users/user_data"

type GalleryItemTransientParams = {
  uid: string
  gid: string
  mid: string
};

export default Factory.define<GalleryItem, GalleryItemTransientParams>(({transientParams, sequence, onCreate}) => {
  onCreate(async (item) => {
    if (transientParams.uid && transientParams.gid && transientParams.mid) {
      await set<GalleryItem>(getGalleryItemRef(
        transientParams.uid,
        transientParams.gid,
        transientParams.mid,
        id), item)
    }

    return item
  })

  const id = sequence.toString()
  const galleryItem: GalleryItem = {
    id: id,
    author: ref(usersCollection, "test-user-1"),
    createdAt: new Date(),
    fileName: "filename.jpg",
    filePath: "filename.jpg",
    thumbnail: false,
    description: "some description",
  }

  return galleryItem
})

