import {collection, get, set} from "typesaurus"
import {Npc} from "./models"

export const npcsCollection = collection<Npc>("npcs")

/**
 * Gets an npc from firestore if already exists
 * @param {string} id item to look up
 * @return {IIAMUserType}
 */
export async function createNpc(id: string): Promise<void> {
  return set(npcsCollection, id, {
    role: "bot",
  })
}


/**
 * Gets an npc from firestore if already exists
 * @param {string} npcId item to look up
 * @return {IIAMUserType}
 */
export async function getNpc(npcId: string): Promise<Npc> {
  return get(npcsCollection, npcId).then((item) => {
    if (item != null) {
      return item.data
    }
    return {} as Npc
  })
}

