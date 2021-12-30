import {query, subcollection, where, limit, add, upset} from "typesaurus"
import {Gffft} from "./models"
import {User} from "../users/models"
import {usersCollection} from "../users/data"

const DEFAULT_GFFFT_KEY = "default"

export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)

/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {Promise<Gffft>}
 */
export async function getOrCreateDefaultGffft(userId: string): Promise<Gffft> {
  const userGfffts = gffftsCollection(userId)

  let gffft = await query(userGfffts, [
    where("key", "==", DEFAULT_GFFFT_KEY),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      const value = results[0].data
      value.id = results[0].ref.id
      return value
    }
    return null
  })

  if (gffft == null) {
    gffft = {
      key: DEFAULT_GFFFT_KEY,
    } as Gffft
    const result = await add<Gffft>(userGfffts, gffft)
    gffft.id = result.id
  }

  return gffft
}


/**
 * @param {userId} userId user to look up
 * @param {gffft} gffft being saved
 * @return {IIAMUserType}
 */
export async function updateGffft(userId: string, gffft: Gffft): Promise<void> {
  console.log(`updating gffft: ${gffft.id}, userId: ${userId}`)
  const userGfffts = gffftsCollection(userId)

  return upset<Gffft>(userGfffts, gffft.id, gffft)
}
