import {WHO_OWNER} from "../boards/board_data"
import {Notebook} from "./notebook_models"
import {notEmpty} from "../common/utils"

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
  return {
    id: notebook.id,
    name: notebook.name,
    description: notebook.description,
    pages: 17,
    updatedAt: notebook.updatedAt ?? new Date(),
    whoCanView: notebook.whoCanView ?? WHO_OWNER,
    whoCanPost: notebook.whoCanPost ?? WHO_OWNER,
  }
}

export function notebooksToJson(notebooks: Notebook[]): INotebookType[] {
  return notebooks.map((notebook) => notebookToJson(notebook))
    .filter(notEmpty)
}
