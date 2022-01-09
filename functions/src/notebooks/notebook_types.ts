import {Notebook} from "./notebook_models"

export interface INotebookType {
    id?: string
    name?: string
    description?: string
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
  }
  return item
}

