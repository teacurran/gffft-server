import {query, subcollection, where, limit, add} from "typesaurus"
import {Board} from "./board_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"

const DEFAULT_BOARD_KEY = "default"

const boardsCollection = subcollection<Board, Gffft, User>("boards", gffftsCollection)

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

