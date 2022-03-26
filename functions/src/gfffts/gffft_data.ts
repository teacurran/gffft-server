import {query, subcollection, where, limit, add, upset, group, order, Query,
  startAfter, get, ref, pathToRef, remove, getRefPath, Ref} from "typesaurus"
import {Gffft, GffftMember, GffftStats, HydratedGffft, TYPE_ANON, TYPE_MEMBER, TYPE_OWNER} from "./gffft_models"
import {HydratedUser, User, UserBookmark} from "../users/user_models"
import {itemOrNull} from "../common/data"
import {getBookmark, getUser, usersCollection} from "../users/user_data"
import {getBoardByRefString} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {getGalleryByRefString} from "../galleries/gallery_data"
import {Gallery} from "../galleries/gallery_models"
import {LinkSet} from "../link-sets/link_set_models"
import {getLinkSetByRefString} from "../link-sets/link_set_data"
import cacheContainer from "../common/redis"
import {Notebook} from "../notebooks/notebook_models"
import {IGffftFeatureRef} from "./gffft_interfaces"
import {getNotebookByRef} from "../notebooks/notebook_data"
import {boardToJson, IBoardType} from "../boards/board_interfaces"
import {INotebookType, notebookToJson} from "../notebooks/notebook_interfaces"
import {galleryToJson, IGalleryType} from "../galleries/gallery_interfaces"
import {ILinkSet, linkSetToJson} from "../link-sets/link_set_interfaces"

const DEFAULT_GFFFT_KEY = "default"
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

export async function getGffftMembership(uid: string, gid: string, memberId?: string): Promise<GffftMember|undefined> {
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
    if (!snapshot.updateCount) {
      snapshot.updateCount = 0
    }
    if (cacheContainer) {
      cacheContainer.setItem(cacheKey, snapshot, {ttl: 20})
    }
  }
  return snapshot
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

  const features: string[] = []
  features.push("fruitCode")
  gffft.features = features;

  [gffft.fruitCode,
    gffft.rareFruits,
    gffft.ultraRareFruits] = await getUniqueFruitCode()

  const result = await add<Gffft>(userGfffts, gffft)
  gffft.id = result.id

  await ensureOwnership(gffft, uid, initialHandle)

  return gffft
}

export async function getDefaultGffft(userId: string): Promise<Gffft | null> {
  const userGfffts = gffftsCollection(userId)

  return query(userGfffts, [
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
  console.log(`looking for gffft:${gid} uid:${uid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)

  return get(gffftRef).then((snapshot) => itemOrNull(snapshot))
}

export async function getFullGffft(uid: string, gid: string, currentUid?: string): Promise<HydratedGffft | null> {
  console.log(`looking for gffft:${gid} uid:${uid}`)
  const userGfffts = gffftsCollection(uid)
  const gffftRef = ref(userGfffts, gid)
  const gffft = await get(gffftRef).then((snapshot) => itemOrNull(snapshot))

  if (gffft == null) {
    return null
  }

  return hydrateGffft(uid, gffft, currentUid)
}

export async function hydrateGffft(uid: string, gffft: Gffft, currentUid?: string): Promise<HydratedGffft | null> {
  if (gffft == null) {
    return null
  }

  gffft.uid = uid

  const boards: Board[] = []
  const galleries: Gallery[] = []
  const notebooks: Notebook[] = []
  const features: IGffftFeatureRef[] = []
  const linkSets: LinkSet[] = []

  if (gffft.features) {
    const featurePromises: Promise<void>[] = []
    for (let i=0; i<gffft.features.length; i++) {
      const feature = gffft.features[i]
      console.log(`looking at feature: ${feature}`)
      if (feature.indexOf("/boards/") != -1) {
        featurePromises.push(getBoardByRefString(feature).then((board) => {
          if (board) {
            boards.push(board)
            if (board.id) {
              features.push({
                type: "board",
                id: board.id,
              })
            }
          }
        }))
      } else if (feature.indexOf("/galleries/") != -1) {
        featurePromises.push(getGalleryByRefString(feature).then((gallery) => {
          if (gallery) {
            galleries.push(gallery)
            features.push({
              type: "gallery",
              id: gallery.id,
            })
          }
        }))
      } else if (feature.indexOf("/notebooks/") != -1) {
        featurePromises.push(getNotebookByRef(feature).then((notebook) => {
          if (notebook) {
            notebooks.push(notebook)
            if (notebook.id) {
              features.push({
                type: "notebook",
                id: notebook.id,
              })
            }
          }
        }))
      } else if (feature.indexOf("/link-sets/") != -1) {
        featurePromises.push(getLinkSetByRefString(feature).then((item) => {
          if (item) {
            linkSets.push(item)
            if (item.id) {
              features.push({
                type: "linkSet",
                id: item.id,
              })
            }
          }
        }))
      } else if (feature == "fruitCode") {
        features.push({
          type: "fruitCode",
          id: "fruitCode",
        })
      }

      await Promise.all(featurePromises)
    }
  }

  const boardJson: IBoardType[] = []
  boards.forEach((board) => {
    const json = boardToJson(board)
    if (json != null) {
      boardJson.push(json)
    }
  })

  const notebookJson: INotebookType[] = []
  notebooks.forEach((notebook) => {
    const json = notebookToJson(notebook)
    if (json != null) {
      notebookJson.push(json)
    }
  })

  const galleryJson: IGalleryType[] = []
  galleries.forEach((gallery) => {
    const json = galleryToJson(gallery)
    if (json != null) {
      galleryJson.push(json)
    }
  })

  const linkSetJson: ILinkSet[] = []
  linkSets.forEach((linkSet) => {
    const json = linkSetToJson(linkSet)
    if (json != null) {
      linkSetJson.push(json)
    }
  })

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
    boards: boardJson,
    galleries: galleryJson,
    notebooks: notebookJson,
    linkSets: linkSetJson,
  } as HydratedGffft
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

async function hydrateUser(uid: string,
  gid: string, user: User): Promise<HydratedUser | Promise<HydratedUser | null> | null> {
  const gffftMembership = await getGffftMembership(uid, gid, user.id)

  return {
    ...user,
    handle: gffftMembership ? gffftMembership.handle ?? `X-${user.id}` : `Y-${user.id}`,
  }
}

export async function getGffftUser(uid: string, gid: string, userRef?: Ref<User>): Promise<HydratedUser | null> {
  if (!userRef) {
    return null
  }
  const cacheKey = `${getRefPath(userRef)}`
  const cachedItem = await cacheContainer?.getItem<User>(cacheKey)

  const user = cachedItem ?? await get<User>(userRef).then((snapshot) => {
    const item = itemOrNull(snapshot)
    if (cacheContainer) {
      cacheContainer.setItem(cacheKey, item, {ttl: 20})
    }

    return item
  })
  if (user == null) {
    return null
  }

  return hydrateUser(uid, gid, user)
}

function HydratedGffft(): HydratedGffft | PromiseLike<HydratedGffft | null> | null {
  throw new Error("Function not implemented.")
}

