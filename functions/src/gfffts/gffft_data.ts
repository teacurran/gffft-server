import {query, subcollection, where, limit, add, upset, group, order, Query, startAfter} from "typesaurus"
import {Gffft} from "./gffft_models"
import {User} from "../users/user_models"
import {usersCollection} from "../users/user_data"

const DEFAULT_GFFFT_KEY = "default"
const FRUIT_CODE_CHARS = "0123456789abcdefghijklmnopqr"

export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)
export const gffftsGroup = group("gfffts", [gffftsCollection])

async function getUniqueFruitCode(): Promise<string> {
  let fruitCode = ""

  // limit loop to prevent overflow
  for (let i = 0; i < 1000; i++) {
    fruitCode = ""
    for (let fc = 0; fc < 6; fc++) {
      fruitCode += FRUIT_CODE_CHARS[Math.floor(Math.random() * FRUIT_CODE_CHARS.length)]
    }

    const fruitCodeExists = await query(gffftsGroup, [
      where("fruitCode", "==", fruitCode),
      limit(1),
    ]).then((results) => {
      return (results.length > 0)
    })

    if (!fruitCodeExists) {
      return fruitCode
    }
  }
  throw new Error("unable to generate unique fruitcode")
}

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
  ]).then(async (results) => {
    if (results.length > 0) {
      const gffft = results[0].data
      gffft.id = results[0].ref.id
      if (!gffft.fruitCode) {
        gffft.fruitCode = await getUniqueFruitCode()
        await updateGffft(userId, gffft)
      }
      return gffft
    }
    return null
  })

  if (gffft == null) {
    gffft = {
      key: DEFAULT_GFFFT_KEY,
      fruitCode: await getUniqueFruitCode(),
    } as Gffft
    const result = await add<Gffft>(userGfffts, gffft)
    gffft.id = result.id
  }

  return gffft
}

export async function getGfffts(userId: string, offset?: string, maxResults = 20, q?: string): Promise<Gffft[]> {
  const queries: Query<Gffft, keyof Gffft>[] = [
    where("enabled", "==", true),
  ]

  if (q) {
    console.log(`using query search: ${q}`)
    // this is a real basic prefix search
    // will probalby upgrade to an external full text later
    const qLower = q.toLowerCase()
    queries.push(where("nameLower", ">=", qLower))
    queries.push(where("nameLower", "<=", qLower+ "\uf8ff"))
    if (offset) {
      queries.push(order("nameLower", "asc", [startAfter(offset)]))
    }
  } else {
    if (offset) {
      console.log(`using non-query offset search: ${offset}`)
      queries.push(order("id", "desc", [startAfter(offset)]))
    } else {
      queries.push(order("id", "desc"))
    }
  }

  queries.push(limit(maxResults))

  return query(gffftsGroup, queries).then((results) => {
    const gfffts: Gffft[] = []
    results.forEach((item) => {
      gfffts.push(item.data)
    })
    return gfffts
  })
}


/**
 * @param {userId} userId user to look up
 * @param {gffft} gffft being saved
 * @return {IIAMUserType}
 */
export async function updateGffft(userId: string, gffft: Gffft): Promise<void> {
  console.log(`updating gffft: ${gffft.id}, userId: ${userId}`)
  const userGfffts = gffftsCollection(userId)
  gffft.nameLower = gffft.name.toLowerCase()

  return upset<Gffft>(userGfffts, gffft.id, gffft)
}

