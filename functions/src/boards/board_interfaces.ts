import {Board} from "./board_models"

export interface IBoardStats {
  label: string,
  threads: number,
  posts: number,
  members: number,
  firstActivity: Date | null,
  updatedAt: Date | null
}

export interface IBoardType {
    id: string
    name?: string
    description?: string,
    stats: IBoardStats
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
  if (board == null || board.id == null) {
    return null
  }
  const item: IBoardType = {
    id: board.id,
    name: board.name,
    description: board.description,
    stats: {
      label: "total",
      threads: 693,
      posts: 98087,
      members: 324,
      firstActivity: new Date(),
      updatedAt: new Date(),
    },
  }
  return item
}

