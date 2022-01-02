import {collection, get} from "typesaurus"
import {Npc} from "./models"

export const npcsCollection = collection<Npc>("npcs")

/**
 * Gets an npc from firestore if already exists
 * @param {string} id item to look up
 * @return {IIAMUserType}
 */
export async function getNpc(id: string): Promise<Npc> {
  let item = await get(npcsCollection, id).then((snapshot) => {
    if (snapshot != null) {
      return snapshot.data
    }
    return null
  })
  if (item == null) {
    item = {} as Npc
  }

  return item
}

