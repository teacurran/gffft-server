import {Notebook} from "./notebook_models"

export interface INotebookStats {
  label: string,
  pages: number,
  members: number,
  firstActivity: Date | null,
  updatedAt: Date | null
}

export interface INotebookType {
    id?: string
    name?: string
    description?: string,
    stats: INotebookStats,
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
    stats: {
      label: "today",
      pages: 17,
      members: 2,
      firstActivity: new Date(),
      updatedAt: new Date(),
    },
  }
  return item
}

