import {collection, get, set, subcollection} from "typesaurus"
import {Board} from "./models"
import {User} from "../users/models"

const DEFAULT_BOARD_ID = "default"

const usersCollection = collection<User>("users")
const boardsCollection = subcollection<Board, User>("boards", usersCollection)

/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultBoard(userId: string): Promise<Board> {
  const userBoards = boardsCollection(userId)
  let board = await get(userBoards, DEFAULT_BOARD_ID).then((snapshot) => {
    if (snapshot != null) {
      return snapshot.data
    }
    return null
  })
  if (board == null) {
    board = {} as Board
    await set<Board>(userBoards, DEFAULT_BOARD_ID, board)
  }

  return board
}

