import {Board} from "./models"

export interface IBoardType {
    id: string;
    name: string;
  }

/**
   * to Json
   * @param {Board} board object to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
export function boardToJson(
    board: Board,
): IBoardType {
  const item: IBoardType = {
    id: board.key,
    name: board.name,
  }
  return item
}

