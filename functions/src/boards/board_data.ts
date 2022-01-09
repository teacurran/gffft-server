import {query, subcollection, where, limit, add, pathToRef, get, upset} from "typesaurus"
import {Board} from "./board_models"
import {User} from "../users/user_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"

const DEFAULT_BOARD_KEY = "default"
const DEFAULT_BOARD_NAME = "board"

export const boardsCollection = subcollection<Board, Gffft, User>("boards", gffftsCollection)

/**
 * gets or creates the default board for a user
 * @param {string} userId
 * @param {string} gffftId
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultBoard(userId: string, gffftId: string): Promise<Board> {
  const userBoards = boardsCollection([userId, gffftId])

  let board = await query(userBoards, [
    where("key", "==", DEFAULT_BOARD_KEY),
    limit(1),
  ]).then(async (results) => {
    if (results.length > 0) {
      const item = results[0].data
      item.id = results[0].ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_BOARD_NAME
        await updateBoard(userId, gffftId, item)
      }
      return item
    }
    return null
  })

  if (board == null) {
    board = {
      key: DEFAULT_BOARD_KEY,
      name: DEFAULT_BOARD_NAME,
    } as Board
    const result = await add<Board>(userBoards, board)
    board.id = result.id
  }

  return board
}

export async function updateBoard(userId: string, gffftId: string, board: Board): Promise<void> {
  console.log(`updating board userId:${userId} gffftId:${gffftId}, boardId: ${board.id}`)
  const userBoards = boardsCollection([userId, gffftId])

  return upset<Board>(userBoards, board.id, board)
}


export async function getBoardByRef(refId: string): Promise<Board | null> {
  const itemRef = pathToRef<Board>(refId)
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const item = snapshot.data
      item.id = snapshot.ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_BOARD_NAME
        await upset<Board>(itemRef, item)
      }

      return item
    }
    return null
  })
}

