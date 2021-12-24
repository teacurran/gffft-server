import {Board} from "./models"

export interface IBoardType {
    id: string
    name?: string
    description?: string
  }

/**
   * to Json
   * @param {Board} board object to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
export function boardToJson(
    board: Board,
): IBoardType | null {
  if (board == null) {
    return null
  }
  const item: IBoardType = {
    id: board.id,
    name: board.name,
    description: board.description,
  }
  return item
}

