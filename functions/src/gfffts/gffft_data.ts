import {query, subcollection, where, limit, add, upset, group, order, Query, startAfter, get, ref} from "typesaurus"
import {DecoratedGffft, Gffft, GffftMember, TYPE_OWNER} from "./gffft_models"
import {User} from "../users/user_models"
import {usersCollection} from "../users/user_data"

const DEFAULT_GFFFT_KEY = "default"
const FRUIT_CODE_CHARS_DISPLAY = [..."🍊🍌🍎🍏🍐🍋🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🥨🐈"]
const FRUIT_CODE_CHARS_STORED = [..."abcdefghijklmnopqrst"]
const FRUIT_CODE_LENGTH = 9

export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)
export const gffftsMembersCollection = subcollection<GffftMember, Gffft, User>("members", gffftsCollection)
export const gffftsGroup = group("gfffts", [gffftsCollection])

export async function getUniqueFruitCode(): Promise<string> {
  let fruitCode = ""

  // limit loop to prevent overflow
  for (let i = 0; i < 1000; i++) {
    fruitCode = ""
    for (let fc = 0; fc < FRUIT_CODE_LENGTH; fc++) {
      fruitCode += FRUIT_CODE_CHARS_STORED[Math.floor(Math.random() * FRUIT_CODE_CHARS_STORED.length)]
    }
    console.log(`checking fruitcode: ${fruitCode}`)

    const fruitCodeExists = await query(gffftsGroup, [
      where("fruitCode", "==", fruitCode),
      limit(1),
    ]).then((results) => {
      console.log(`got results: ${results.length}`)
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

function translateFruitCodeToEmoji(fruitCode: string): string[] {
  console.log(`translating fc:${fruitCode}`)
  const fcEmoji: string[] = []
  for (let index = 0; index < fruitCode.length; index++) {
    const thisChar = fruitCode.charAt(index)
    const position = FRUIT_CODE_CHARS_STORED.indexOf(thisChar)
    console.log(`new char:${FRUIT_CODE_CHARS_DISPLAY[position]}`)
    fcEmoji[index] = FRUIT_CODE_CHARS_DISPLAY[position]
  }
  console.log("emoji version fc:" + fcEmoji + "")
  return fcEmoji
}

export function decorateGffft(gffft: Gffft): DecoratedGffft {
  return {
    ...gffft,
    fruitCodeEmoji: translateFruitCodeToEmoji(gffft.fruitCode ?? ""),
  }
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
      await ensureOwnership(gffft, userId)
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

export async function getGffft(userId: string, gffftId: string): Promise<Gffft | null> {
  const userGfffts = gffftsCollection(userId)
  const gffftRef = ref(userGfffts, gffftId)

  return get(gffftRef).then((snapshot) => {
    return snapshot == null ? null : snapshot.data
  })
}

export async function getDecoratedGffft(userId: string, gffftId: string): Promise<DecoratedGffft | null> {
  const userGfffts = gffftsCollection(userId)
  const gffftRef = ref(userGfffts, gffftId)

  return get(gffftRef).then((snapshot) => {
    return snapshot == null ? null : decorateGffft(snapshot.data)
  })
}
