import {Doc} from "typesaurus"

export interface ItemWithId {
    id: string
}

export const itemOrNull = <T extends ItemWithId>(snapshot: Doc<T> | null): T | null => {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id
  return item
}
