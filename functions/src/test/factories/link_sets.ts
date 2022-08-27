import {Factory} from "fishery"
import {set} from "typesaurus"
import {DEFAULT_GALLERY_KEY} from "../../galleries/gallery_data"
import {LinkSet} from "../../link-sets/link_set_models"
import {getLinkSetRef} from "../../link-sets/link_set_data"

type LinkSetTransientParams = {
  uid: string
  gid: string
};

export default Factory.define<LinkSet, LinkSetTransientParams>(({transientParams, sequence, onCreate}) => {
  onCreate(async (item) => {
    if (transientParams.uid && transientParams.gid) {
      await set<LinkSet>(getLinkSetRef(transientParams.uid, transientParams.gid, id), item)
    }

    return item
  })

  const id = sequence.toString()
  const linkSet: LinkSet = {
    id: id,
    key: DEFAULT_GALLERY_KEY,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemCount: 0,
  }

  return linkSet
})

