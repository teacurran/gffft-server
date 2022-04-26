import {WHO_OWNER} from "../boards/board_data"
import {Notebook} from "./notebook_models"

export interface INotebookType {
    id?: string
    name?: string
    description?: string,
    pages: number,
    updatedAt: Date | null
    whoCanView: string
    whoCanPost: string
  }

export function notebookToJson(
  notebook: Notebook,
): INotebookType | null {
  if (notebook == null) {
    return null
  }
  const item: INotebookType = {
    id: notebook.id,
    name: notebook.name,
    description: notebook.description,
    pages: 17,
    updatedAt: notebook.updatedAt ?? new Date(),
    whoCanView: notebook.whoCanView ?? WHO_OWNER,
    whoCanPost: notebook.whoCanPost ?? WHO_OWNER,
  }
  return item
}

