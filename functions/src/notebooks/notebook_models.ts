export type Notebook = {
    id: string,
    key: string,
    name?: string,
    description?: string,
    whoCanView?: string
    whoCanPost?: string
    createdAt: Date
    updatedAt: Date
  }

