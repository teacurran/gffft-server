import {collection, query, subcollection, where, limit, add} from "typesaurus"
import {Board} from "./models"
import {User} from "../users/models"

const DEFAULT_BOARD_KEY = "default"

const usersCollection = collection<User>("users")
const boardsCollection = subcollection<Board, User>("boards", usersCollection)

/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultBoard(userId: string): Promise<Board> {
  const userBoards = boardsCollection(userId)

  let board = await query(userBoards, [
    where("key", "==", DEFAULT_BOARD_KEY),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      const value = results[0].data
      value.id = results[0].ref.id
      return value
    }
    return null
  })

  if (board == null) {
    board = {
      key: DEFAULT_BOARD_KEY,
    } as Board
    const result = await add<Board>(userBoards, board)
    board.id = result.id
  }

  return board
}

