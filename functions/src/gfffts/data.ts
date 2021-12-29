import {query, subcollection, where, limit, add} from "typesaurus"
import {Gffft} from "./models"
import {User} from "../users/models"
import {usersCollection} from "../users/data"

const DEFAULT_GFFFT_KEY = "default"

export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)

/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {IIAMUserType}
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

