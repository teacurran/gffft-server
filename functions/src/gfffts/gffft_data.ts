import {
  query,
  subcollection,
  where,
  limit,
  upset,
  group,
  order,
  Query,
  startAfter,
  get,
  ref,
  pathToRef,
  remove,
  getRefPath,
  Ref,
  id,
  set, value, Collection,
} from "typesaurus"
import {
  Gffft, GffftMember,
  HydratedGffft, TYPE_ANON, TYPE_MEMBER, TYPE_OWNER, GffftStats,
  GffftOwnerCountUpset, GffftAdminCountUpset, GffftMemberCountUpset, GffftAnonCountUpset, TYPE_ADMIN} from "./gffft_models"
import {HydratedUser, User, UserBookmark} from "../users/user_models"
import {itemOrNull} from "../common/data"
import {getBookmark, getUser, usersCollection} from "../users/user_data"
import {boardsCollection, getBoardByRefString, getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {galleryCollection, getGalleryByRefString, getOrCreateDefaultGallery} from "../galleries/gallery_data"
import {Gallery} from "../galleries/gallery_models"
import {LinkSet} from "../link-sets/link_set_models"
import {getLinkSetByRefString} from "../link-sets/link_set_data"
import cacheContainer from "../common/redis"
import {Notebook} from "../notebooks/notebook_models"
import {IGffftFeatureRef} from "./gffft_interfaces"

export const COLLECTION_GFFFTS = "gfffts"

export const DEFAULT_GFFFT_KEY = "default"
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
  const isPiDay = todaysDate.getMonth() == 3 && todaysDate.getDay() == 14

  // limit loop to prevent overflow
  for (let i = 0; i < 1000; i++) {
    fruitCode = ""
    for (let fc = 0; fc < FRUIT_CODE_LENGTH; fc++) {
      if (isPiDay && randBelow(10000) == 9999) {
        console.log("Pi Day ULTRA RARE FRUIT GENERATED!")
        ultraRareFruitEncountered++
        fruitCode += PI_DAY_FRUITS[randBelow(PI_DAY_FRUITS.length)]
      } else if (randBelow(100000) >= 99990) {
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

    const fruitCodeExists = await query(gffftsGroup, [where("fruitCode", "==", fruitCode), limit(1)])
      .then((results) => results.length > 0)

    if (!fruitCodeExists) {
      return [fruitCode, rareFruitEncountered, ultraRareFruitEncountered]
    }
  }
  throw new Error("unable to generate unique fruitcode")
}

export async function checkGffftHandle(uid: string, gid: string, memberId: string, handle: string): Promise<boolean> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const userRef = ref(usersCollection, memberId)

  const membership = await query(gffftMembers, [where("handle", "==", handle), limit(1)]).then(itemOrNull)

  if (membership) {
    console.log(`checking membership ${getRefPath(membership.user)} == ${getRefPath(userRef)}`)
    if (getRefPath(membership.user) == getRefPath(userRef)) {
      return true
    }
    return false
  }

  return true
}

export async function createGffftMembership(
  uid: string,
  gid: string,
  memberId: string,
  handle: string | null
): Promise<GffftMember> {
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

  const cacheKey = `${uid}-${gid}-${memberId}`
  await cacheContainer?.setItem(cacheKey, null, {})

  return remove(memberRef)
}

async function ensureOwnership(gffft: Gffft, userId: string, handle: string): Promise<void> {
  const gffftMembers = gffftsMembersCollection([userId, gffft.id])
  const userRef = ref(usersCollection, userId)
  const memberRef = ref(gffftMembers, userId)
  return getGffftMembership(userId, gffft.id, userId).then(async (m) => {
    if (m == null) {
      const member = {
        handle: handle,
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

export async function createGffft(uid: string, gffft: Gffft, initialHandle: string): Promise<Gffft> {
  const userGfffts = gffftsCollection(uid)

  gffft.uid = uid
  gffft.createdAt = new Date()
  gffft.updatedAt = new Date()
  gffft.nameLower = gffft.name.toLowerCase()

  if (!gffft.fruitCode) {
    [gffft.fruitCode, gffft.rareFruits, gffft.ultraRareFruits] = await getUniqueFruitCode()
  }

  const gid = gffft.id || await id()
  const gffftRef = ref(userGfffts, gid)

  const features: string[] = []

  console.log(`uid: ${uid} gid: ${gid}`)

  const gfffts = gffftsCollection(ref(usersCollection, uid))

  const board: Board = await getOrCreateDefaultBoard(uid, gid)
  const userBoards = boardsCollection(ref(gfffts, gid))
  const boardRef = getRefPath(ref(userBoards, board.id))
  features.push(boardRef)

  const gallery: Gallery = await getOrCreateDefaultGallery(uid, gid)
  const galleries = galleryCollection(ref(gfffts, gid))
  const galleryRef = getRefPath(ref(galleries, gallery.id))
  features.push(galleryRef)

  features.push("fruitCode")
  gffft.features = features

  await set<Gffft>(gffftRef, gffft)

  gffft.id = gid

  await ensureOwnership(gffft, uid, initialHandle)

  return gffft
}

export async function getGffftMembership(
  uid: string,
  gid: string,
  memberId?: string
): Promise<GffftMember | undefined> {
  if (!memberId) {
    return undefined
  }
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)
  const cacheKey = `${uid}-${gid}-${memberId}`

  const cachedItem = await cacheContainer?.getItem<GffftMember>(cacheKey)
  if (cachedItem) {
    console.log(`returning cached item for memberId: ${memberId}`)
    return cachedItem
  }

  const memberDoc = await get(memberRef)
  let snapshot: GffftMember | undefined
  if (memberDoc != null) {
    snapshot = memberDoc.data
    if (cacheContainer) {
      cacheContainer.setItem(cacheKey, snapshot, {ttl: 20})
    }
  }
  return snapshot
}

export function getGffftRef(uid: string, gid: string): Ref<Gffft> {
  return ref(gffftsCollection(uid), gid)
}

export async function getOrCreateGffftMembership(uid: string, gid: string, memberId: string): Promise<GffftMember> {
  const gffftMembers = gffftsMembersCollection([uid, gid])
  const memberRef = ref(gffftMembers, memberId)
  return get(memberRef).then(async (snapshot) => {
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
      await upset(memberRef, member)
    }

    return member
  })
}

export async function getDefaultGffft(userId: string): Promise<Gffft | null> {
  const userGfffts = gffftsCollection(userId)

  return query(userGfffts, [where("key", "==", DEFAULT_GFFFT_KEY), limit(1)]).then(itemOrNull)
}

export async function getGffft(uid: string, gid: string): Promise<Gffft | null> {
  console.log(`looking for gffft:${gid} uid:${uid}`)
  if (gid == "default") {
    return getDefaultGffft(uid)
  }
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  return get(gffftRef).then((snapshot) => itemOrNull(snapshot))
}

export async function getGfffts(offset?: string, maxResults = 20, q?: string, memberId?: string): Promise<Gffft[]> {
  const queries: Query<Gffft, keyof Gffft>[] = [where("enabled", "==", true)]

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
    queries.push(where("nameLower", "<=", qLower + "\uf8ff"))
    if (offset) {
      queries.push(order("nameLower", "asc", [startAfter(offset.toLowerCase())]))
    }
  } else {
    if (offset) {
      console.log(`using non-query offset search: ${offset}`)
      queries.push(order("nameLower", "asc", [startAfter(offset.toLowerCase())]))
    } else {
      queries.push(order("nameLower", "asc"))
    }
  }

  // try searching by fruit first, see if we get results.
  if (maybeFruit != null) {
    console.log(`looking for maybe fruit: ${maybeFruit}`)
    const fruitResults = await query(gffftsGroup, [where("fruitCode", "==", maybeFruit), limit(1)])
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

export function getGffftStatsCollection(uid: string, gid: string): Collection<GffftStats> {
  const userGfffts = gffftsCollection(ref(usersCollection, uid))
  const gffftRef = ref(userGfffts, gid)
  return gffftsStatsCollection(gffftRef)
}
export function getGffftStatsRef(uid: string, gid: string, key: string): Ref<GffftStats> {
  return ref(getGffftStatsCollection(uid, gid), key)
}

export async function getGffftStats(uid: string, gid: string, key: string): Promise<GffftStats> {
  const statsRef = getGffftStatsRef(uid, gid, key)
  let stats = await get(statsRef).then(itemOrNull)
  if (!stats) {
    return Promise.resolve({
      id: key,
      ownerCount: 0,
      adminCount: 0,
      memberCount: 0,
      anonCount: 0,
    })
  }
  stats = {
    id: stats.id,
    anonCount: stats.anonCount || 0,
    adminCount: stats.adminCount || 0,
    memberCount: stats.memberCount || 0,
    ownerCount: stats.ownerCount || 0,
  }
  return stats
}

export async function getFullGffft(uid: string, gid: string, currentUid?: string): Promise<HydratedGffft | null> {
  console.log(`looking for gffft:${gid} uid:${uid}`)
  const gffft = await getGffft(uid, gid)

  if (gffft == null) {
    return null
  }

  return hydrateGffft(uid, gffft, currentUid)
}

export async function hydrateGffft(uid: string, gffft: Gffft, currentUid?: string): Promise<HydratedGffft> {
  gffft.uid = uid

  const boards: Board[] = []
  const galleries: Gallery[] = []
  const notebooks: Notebook[] = []
  const features: IGffftFeatureRef[] = []
  const linkSets: LinkSet[] = []

  if (gffft.features) {
    const featurePromises: Promise<void>[] = []
    for (const feature of gffft.features) {
      console.log(`looking at feature: ${feature}`)
      if (feature.indexOf("/boards/") != -1) {
        featurePromises.push(getBoardPromise(features, feature, boards))
      } else if (feature.indexOf("/galleries/") != -1) {
        featurePromises.push(getGalleryPromise(features, feature, galleries))
      } else if (feature.indexOf("/link-sets/") != -1) {
        featurePromises.push(getLinkSetPromise(features, feature, linkSets))
      } else if (feature == "fruitCode") {
        features.push({
          type: "fruitCode",
          id: "fruitCode",
        })
      }

      await Promise.all(featurePromises)
    }
  }

  let membership: GffftMember | undefined
  let bookmark: UserBookmark | undefined
  let user: User | undefined
  if (currentUid) {
    membership = await getOrCreateGffftMembership(uid, gffft.id, currentUid)
    bookmark = await getBookmark(uid, gffft.id, currentUid)
    user = await getUser(uid)
  }

  return {
    ...gffft,
    me: user,
    membership: membership,
    bookmark: bookmark,
    featureSet: features,
    boards: boards,
    galleries: galleries,
    notebooks: notebooks,
    linkSets: linkSets,
  } as HydratedGffft
}

export async function getGffftByRef(refId: string): Promise<Gffft | null> {
  return get(pathToRef<Gffft>(refId)).then(itemOrNull)
}

async function hydrateUser(
  uid: string,
  gid: string,
  user: User
): Promise<HydratedUser | Promise<HydratedUser | null> | null> {
  const gffftMembership = await getGffftMembership(uid, gid, user.id)

  return {
    ...user,
    handle: gffftMembership ? gffftMembership.handle ?? user.id : user.id,
  }
}

export async function getGffftUser(uid: string, gid: string, userRef?: Ref<User>): Promise<HydratedUser | null> {
  if (!userRef) {
    return null
  }
  const cacheKey = `${getRefPath(userRef)}`
  const cachedItem = await cacheContainer?.getItem<User>(cacheKey)

  const user =
    cachedItem ??
    (await get<User>(userRef).then((snapshot) => {
      const item = itemOrNull(snapshot)
      if (cacheContainer) {
        cacheContainer.setItem(cacheKey, item, {ttl: 20})
      }

      return item
    }))
  if (user == null) {
    return null
  }

  return hydrateUser(uid, gid, user)
}

function getGalleryPromise(features: IGffftFeatureRef[], feature: string, galleries: Gallery[]): Promise<void> {
  return getGalleryByRefString(feature).then((item) => {
    if (item && item.id) {
      galleries.push(item)
      features.push({
        type: "gallery",
        id: item.id,
      })
    }
  })
}

function getBoardPromise(features: IGffftFeatureRef[], feature: string, boards: Board[]): Promise<void> {
  return getBoardByRefString(feature).then((item) => {
    if (item && item.id) {
      boards.push(item)
      features.push({
        type: "board",
        id: item.id,
      })
    }
  })
}

function getLinkSetPromise(features: IGffftFeatureRef[], feature: string, linkSets: LinkSet[]): Promise<void> {
  return getLinkSetByRefString(feature).then((item) => {
    if (item && item.id) {
      linkSets.push(item)
      features.push({
        type: "linkSet",
        id: item.id,
      })
    }
  })
}

export async function updateCounter(uid: string, gid: string, counterName: string, type: string, changeValue: number): Promise<void> {
  console.log(`updating counter: ${uid}/${gid}/${counterName} type:${type} value:${changeValue}`)
  const collection = getGffftStatsCollection(uid, gid)
  switch (type) {
  case TYPE_OWNER:
    return upset<GffftOwnerCountUpset>(collection, counterName, {
      ownerCount: value("increment", changeValue),
    })
  case TYPE_ADMIN:
    return upset<GffftAdminCountUpset>(collection, counterName, {
      adminCount: value("increment", changeValue),
    })
  case TYPE_MEMBER:
    return upset<GffftMemberCountUpset>(collection, counterName, {
      memberCount: value("increment", changeValue),
    })
  case TYPE_ANON:
    return upset<GffftAnonCountUpset>(collection, counterName, {
      anonCount: value("increment", changeValue),
    })
  default:
    break
  }
}

export async function updateGffft(uid: string, gid: string, gffft: Gffft): Promise<void> {
  console.log(`updating gffft, uid:${uid} gid:${gid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  gffft.nameLower = gffft.name ? gffft.name.toLowerCase() : ""

  return upset<Gffft>(gffftRef, gffft)
}
