import {query, subcollection, where, limit, add, upset, group, order, Query,
  startAfter, get, ref, pathToRef, remove, getRefPath} from "typesaurus"
import {Gffft, GffftMember, GffftStats, TYPE_ANON, TYPE_MEMBER, TYPE_OWNER} from "./gffft_models"
import {User} from "../users/user_models"
import {itemOrNull} from "../common/data"
import {usersCollection} from "../users/user_data"
import {boardsCollection, getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {galleryCollection, getOrCreateDefaultGallery} from "../galleries/gallery_data"
import {Gallery} from "../galleries/gallery_models"
import {LinkSet} from "../link-sets/link_set_models"
import {getOrCreateDefaultLinkSet, linkSetCollection} from "../link-sets/link_set_data"

const DEFAULT_GFFFT_KEY = "default"
const DEFAULT_STRING = "{default}"
const FRUITS = [..."🍊🍌🍎🍏🍐🍋🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝"]
const RARE_FRUITS = [..."🍅🫑🍆🥑"]
const ULTRA_RARE_FRUITS = [..."🥨🐈💾🧀"]
const PI_DAY_FRUITS = [..."🥧🍕𝜋"]
const FRUIT_CODE_LENGTH = 9


export const gffftsCollection = subcollection<Gffft, User>("gfffts", usersCollection)
export const gffftsMembersCollection = subcollection<GffftMember, Gffft, User>("members", gffftsCollection)
export const gffftsStatsCollection = subcollection<GffftStats, Gffft, User>("stats", gffftsCollection)
export const gffftsGroup = group("gfffts", [gffftsCollection])

function randBelow(high: number): number {
  return Math.floor(Math.random() * high)
}

export async function getUniqueFruitCode(): Promise<[string, number, number]> {
  let fruitCode = ""
  let rareFruitEncountered = 0
  let ultraRareFruitEncountered = 0

  const todaysDate = new Date()
  const isPiDay = (todaysDate.getMonth() == 3 && todaysDate.getDay() == 14)

  // limit loop to prevent overflow
  for (let i = 0; i < 1000; i++) {
    fruitCode = ""
    for (let fc = 0; fc < FRUIT_CODE_LENGTH; fc++) {
      if (isPiDay && randBelow(10000) == 9999) {
        console.log("Pi Day ULTRA RARE FRUIT GENERATED!")
        ultraRareFruitEncountered++
        fruitCode += PI_DAY_FRUITS[randBelow(PI_DAY_FRUITS.length)]
      } else if (randBelow(1000000) >= 999990) {
        console.log("ULTRA RARE FRUIT GENERATED!")
        ultraRareFruitEncountered++
        fruitCode += ULTRA_RARE_FRUITS[randBelow(ULTRA_RARE_FRUITS.length)]
      } else if (randBelow(1000) >= 995) {
        console.log("RARE FRUIT GENERATED!")
        rareFruitEncountered++
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
      return [fruitCode, rareFruitEncountered, ultraRareFruitEncountered]
    }
  }
  throw new Error("unable to generate unique fruitcode")
}

export async function checkGffftHandle(uid: string,
  gid: string,
  memberId: string,
  handle: string): Promise<boolean> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)

  const membership = await query(gffftMembers, [
    where("handle", "==", handle),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      return results[0].data
    }
    return null
  })

  if (membership) {
    if (getRefPath(membership.user) == getRefPath(memberRef)) {
      return true
    }
    return false
  }

  return true
}

export async function createGffftMembership(uid: string,
  gid: string,
  memberId: string,
  handle: string | null): Promise<GffftMember> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const userRef = ref(usersCollection, memberId)
  const memberRef = ref(gffftMembers, memberId)

  return get(memberRef).then(async (snapshot) => {
    let needsUpdate = false
    let member: GffftMember
    if (snapshot != null) {
      member = snapshot.data
    } else {
      member = {
        user: userRef,
        handle: handle,
        type: TYPE_MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as GffftMember
      needsUpdate = true
    }

    if (member.type == TYPE_ANON) {
      member.type = TYPE_MEMBER
      member.updatedAt = new Date()
      needsUpdate = true
    }

    if (member.handle != handle) {
      member.handle = handle ? handle : undefined
      member.updatedAt = new Date()
      needsUpdate = true
    }

    if (needsUpdate) {
      await upset(memberRef, member)
    }
    return member
  })
}

export async function deleteGffftMembership(uid: string, gid: string, memberId: string): Promise<void> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)

  return remove(memberRef)
}

export async function getGffftMembership(uid: string, gid: string, memberId: string): Promise<GffftMember|undefined> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)
  return get(memberRef).then((snapshot) => {
    return snapshot == null ? undefined : snapshot.data
  })
}

export async function getOrCreateGffftMembership(
  uid: string,
  gid: string,
  memberId: string): Promise<GffftMember> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)
  return get(memberRef).then((snapshot) => {
    let member: GffftMember
    if (snapshot != null) {
      member = snapshot.data
    } else {
      member = {
        user: memberRef,
        type: TYPE_ANON,
        updateCounters: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as GffftMember
    }

    return member
  })
}

async function ensureOwnership(gffft: Gffft, userId: string): Promise<void> {
  const gffftMembers = gffftsMembersCollection([userId, gffft.id])
  const userRef = ref(usersCollection, userId)
  const memberRef = ref(gffftMembers, userId)
  return getGffftMembership(userId, gffft.id, userId).then(async (m) => {
    if (m == null) {
      const member = {
        user: userRef,
        type: TYPE_OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as GffftMember
      return upset(memberRef, member)
    } else {
      if (m.type != TYPE_OWNER) {
        m.type = TYPE_OWNER
        m.updatedAt = new Date()
        return upset(memberRef, m)
      }
    }
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
        [gffft.fruitCode,
          gffft.rareFruits,
          gffft.ultraRareFruits] = await getUniqueFruitCode()
        await updateGffft(userId, gffft.id, gffft)
      } else if (gffft.fruitCode.length < FRUIT_CODE_LENGTH) {
        [gffft.fruitCode,
          gffft.rareFruits,
          gffft.ultraRareFruits] = await getUniqueFruitCode()
        await updateGffft(userId, gffft.id, gffft)
      }
      if (!gffft.uid) {
        gffft.uid = userId
        await updateGffft(userId, gffft.id, gffft)
      }
      // await ensureOwnership(gffft, userId)
      return gffft
    }
    return null
  })

  if (gffft == null) {
    gffft = {
      key: DEFAULT_GFFFT_KEY,
      uid: userId,
      name: DEFAULT_STRING,
      intro: DEFAULT_STRING,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Gffft
    [gffft.fruitCode,
      gffft.rareFruits,
      gffft.ultraRareFruits] = await getUniqueFruitCode()
    const result = await add<Gffft>(userGfffts, gffft)
    gffft.id = result.id

    const features: string[] = []
    const board: Board = await getOrCreateDefaultBoard(userId, gffft.id)
    const userBoards = boardsCollection([userId, gffft.id])
    const itemRef = getRefPath(ref(userBoards, board.id))
    features.push(itemRef)

    const gallery: Gallery = await getOrCreateDefaultGallery(userId, gffft.id)
    const gfffts = gffftsCollection(ref(usersCollection, userId))
    const galleries = galleryCollection(ref(gfffts, gffft.id))
    const galleryRef = getRefPath(ref(galleries, gallery.id))
    features.push(galleryRef)

    const linkSet: LinkSet = await getOrCreateDefaultLinkSet(userId, gffft.id)
    const linkSets = linkSetCollection(ref(gfffts, gffft.id))
    const linkSetRef = getRefPath(ref(linkSets, linkSet.id))
    features.push(linkSetRef)

    features.push("fruitCode")

    gffft.features = features

    updateGffft(userId, gffft.id, gffft)
  }

  await ensureOwnership(gffft, userId)

  return gffft
}

export async function getGfffts(offset?: string, maxResults = 20, q?: string, memberId?: string): Promise<Gffft[]> {
  const queries: Query<Gffft, keyof Gffft>[] = [
    where("enabled", "==", true),
  ]

  let maybeFruit: string | null = null
  if (q) {
    console.log(`using query search: ${q}`)

    let qFiltered = decodeURI(q)
    qFiltered = qFiltered.replace(/(\s|\r\n|\n|\r)/gm, "")
    if (qFiltered.indexOf("!") > -1) {
      maybeFruit = qFiltered.substring(qFiltered.indexOf("!") + 1).trim()
    } else {
      maybeFruit = qFiltered.trim()
    }

    // this is a real basic prefix search
    // will probalby upgrade to an external full text later
    const qLower = qFiltered.toLowerCase()

    console.log(`searching for: ${qLower}`)
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

  // try searching by fruit first, see if we get results.
  if (maybeFruit != null) {
    console.log(`looking for maybe fruit: ${maybeFruit}`)
    const fruitResults = await query(gffftsGroup, [
      where("fruitCode", "==", maybeFruit),
      limit(1),
    ])
    if (fruitResults != null && fruitResults.length > 0) {
      const gffft = fruitResults[0].data
      console.log(`found by fruit: ${gffft.id}`)
      return [gffft]
    }
  }

  queries.push(limit(maxResults))

  return query(gffftsGroup, queries).then(async (results) => {
    const gfffts: Gffft[] = []
    for (const snapshot of results) {
      const item = snapshot.data
      item.id = snapshot.ref.id

      if (item.uid && item.id && memberId) {
        item.membership = await getGffftMembership(item.uid, item.id, memberId)
      }

      gfffts.push(item)
    }
    return gfffts
  })
}

export async function updateGffft(uid: string, gid: string, gffft: Gffft): Promise<void> {
  console.log(`updating gffft, uid:${uid} gid:${gid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  gffft.nameLower = gffft.name ? gffft.name.toLowerCase() : ""

  return upset<Gffft>(gffftRef, gffft)
}

export async function getGffft(uid: string, gid: string): Promise<Gffft | null> {
  if (gid == "default") {
    return getOrCreateDefaultGffft(uid)
  }
  console.log(`looking for gffft:${gid} uid:${uid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  return get(gffftRef).then((snapshot) => itemOrNull(snapshot))
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

