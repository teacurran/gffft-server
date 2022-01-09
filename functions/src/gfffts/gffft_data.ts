import {query, subcollection, where, limit, add, upset, group, order, Query,
  startAfter, get, ref, pathToRef} from "typesaurus"
import {Gffft, GffftMember, GffftStats, TYPE_OWNER} from "./gffft_models"
import {User} from "../users/user_models"
import {usersCollection} from "../users/user_data"

const DEFAULT_GFFFT_KEY = "default"
const FRUITS = [..."🍊🍌🍎🍏🍐🍋🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝"]
const RARE_FRUITS = [..."🍅🫑🍆🥑"]
const ULTRA_RARE_FRUITS = ["...🥨🐈💾🍕"]
const FRUIT_CODE_LENGTH = 9

export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)
export const gffftsMembersCollection = subcollection<GffftMember, Gffft, User>("members", gffftsCollection)
export const gffftsStatsCollection = subcollection<GffftStats, Gffft, User>("stats", gffftsCollection)
export const gffftsGroup = group("gfffts", [gffftsCollection])

function randBelow(high: number): number {
  return Math.floor(Math.random() * high)
}

export async function getUniqueFruitCode(): Promise<string> {
  let fruitCode = ""

  // limit loop to prevent overflow
  for (let i = 0; i < 1000; i++) {
    fruitCode = ""
    for (let fc = 0; fc < FRUIT_CODE_LENGTH; fc++) {
      if (randBelow(1000000) == 999999) {
        console.log("ULTRA RARE FRUIT GENERATED!")
        fruitCode += ULTRA_RARE_FRUITS[randBelow(ULTRA_RARE_FRUITS.length)]
      } else if (randBelow(1000) == 999) {
        console.log("RARE FRUIT GENERATED!")
        fruitCode += RARE_FRUITS[randBelow(RARE_FRUITS.length)]
      } else {
        fruitCode += FRUITS[randBelow(FRUITS.length)]
      }
    }
    console.log(`checking fruitcode: ${fruitCode}`)

    const fruitCodeExists = await query(gffftsGroup, [
      where("fruitCode", "==", fruitCode),
      limit(1),
    ]).then((results) => {
      return (results.length > 0)
    }).catch((reason) => {
      console.log(`encountered error: ${reason}`)
    })

    if (!fruitCodeExists) {
      return fruitCode
    }
  }
  throw new Error("unable to generate unique fruitcode")
}

async function ensureOwnership(gffft: Gffft, userId: string): Promise<void> {
  const gffftMembers = gffftsMembersCollection([userId, gffft.id])
  const userRef = ref(usersCollection, userId)
  const memberRef = ref(gffftMembers, userId)
  return get(memberRef).then((snapshot) => {
    if (snapshot == null) {
      const member = {
        user: userRef,
        type: TYPE_OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as GffftMember
      return upset(memberRef, member)
    } else {
      const member = snapshot.data
      if (member.type != TYPE_OWNER) {
        member.type = TYPE_OWNER
        member.updatedAt = new Date()
        return upset(memberRef, member)
      }
    }
    return
  })
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

      // below this are hacks to upgrade data as I've changed my mind about it.
      if (!gffft.fruitCode) {
        gffft.fruitCode = await getUniqueFruitCode()
        await updateGffft(userId, gffft)
      } else if (gffft.fruitCode.length < FRUIT_CODE_LENGTH) {
        gffft.fruitCode = await getUniqueFruitCode()
        await updateGffft(userId, gffft)
      }
      if (!gffft.uid) {
        gffft.uid = userId
        await updateGffft(userId, gffft)
      }
      await ensureOwnership(gffft, userId)
      return gffft
    }
    return null
  })

  if (gffft == null) {
    gffft = {
      key: DEFAULT_GFFFT_KEY,
      fruitCode: await getUniqueFruitCode(),
      uid: userId,
    } as Gffft
    const result = await add<Gffft>(userGfffts, gffft)
    gffft.id = result.id
  }

  await ensureOwnership(gffft, userId)

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
      queries.push(order("nameLower", "asc", [startAfter(offset)]))
    } else {
      queries.push(order("nameLower", "asc"))
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
  gffft.nameLower = gffft.name ? gffft.name.toLowerCase() : ""

  return upset<Gffft>(userGfffts, gffft.id, gffft)
}

export async function getGffft(uid: string, gid: string): Promise<Gffft | null> {
  console.log(`looking for gffft:${gid} uid:${uid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  return get(gffftRef).then((snapshot) => {
    if (snapshot == null) {
      return null
    }
    const item = snapshot.data
    item.id = snapshot.ref.id
    return item
  })
}

export async function getGffftByRef(refId: string): Promise<Gffft | null> {
  return get(pathToRef<Gffft>(refId)).then((snapshot) => {
    if (snapshot != null) {
      const data = snapshot.data
      data.id = snapshot.ref.id
      return data
    }
    return null
  })
}

