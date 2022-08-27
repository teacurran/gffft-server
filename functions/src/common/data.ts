import {DocumentData} from "@firebase/firestore"
import {Doc} from "typesaurus"

export interface ItemWithId {
    id?: string
}

export const itemOrNull = <T extends ItemWithId>(snapshot: Doc<T> | Doc<T>[] | null): T | null => {
  if (snapshot == null) {
    return null
  }
  let item: T | null = null
  if (Array.isArray(snapshot)) {
    if (snapshot.length > 0) {
      item = snapshot[0].data
      item.id = snapshot[0].ref.id
    }
  } else {
    item = snapshot.data
    item.id = snapshot.ref.id
  }
  return item
}

export const itemOrUndefined = <T extends ItemWithId>(snapshot: Doc<T> | null): T | undefined => {
  if (!snapshot) {
    return undefined
  }
  const item = snapshot.data
  item.id = snapshot.ref.id
  return item
}

export const deleteFirestoreItem = async <T extends ItemWithId>(snapshot: DocumentData | null): Promise<void> => {
  if (!snapshot) {
    return
  }
  if (snapshot != null) {
    if (snapshot.exists) {
      return snapshot.ref.delete()
    }
  }
}
