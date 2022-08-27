import {Factory} from "fishery"
import {set} from "typesaurus"
import {Board} from "../../boards/board_models"
import {getBoardRef, DEFAULT_BOARD_KEY} from "../../boards/board_data"

type BoardTransientParams = {
  uid: string
  gid: string
};

export default Factory.define<Board, BoardTransientParams>(({transientParams, sequence, onCreate}) => {
  onCreate(async (item) => {
    if (transientParams.uid && transientParams.gid) {
      await set<Board>(getBoardRef(transientParams.uid, transientParams.gid, id), item)
    }

    return item
  })

  const id = sequence.toString()
  const gallery: Board = {
    id: id,
    key: DEFAULT_BOARD_KEY,
    createdAt: new Date(),
    updatedAt: new Date(),
    threadCount: 0,
    postCount: 0,
  }

  return gallery
})

