import {QueryDocumentSnapshot, WriteResult} from "@google-cloud/firestore"
import * as firebaseAdmin from "firebase-admin"
import {collection, get, query, where, limit, subcollection, all, ref, upset, remove} from "typesaurus"
import {itemOrNull, itemOrUndefined} from "../common/data"
import {randomInt} from "../common/utils"
import {getGffft, getGffftMembership, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {HydratedUserBookmark, User, UserBookmark} from "./user_models"

export const COLLECTION_USERS = "users"
export const COLLECTION_ADJECTIVES = "username_adjectives"
export const COLLECTION_NOUNS = "username_nouns"
export const COLLECTION_VERBS = "username_verbs"
export const COLLECTION_BOOKMARKS = "bookmarks"

export const usersCollection = collection<User>(COLLECTION_USERS)
export const bookmarksCollection = subcollection<UserBookmark, User>(COLLECTION_BOOKMARKS, usersCollection)

export const addAdjective = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_ADJECTIVES, value)
}

export const addNoun = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_NOUNS, value)
}

export const addVerb = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_VERBS, value)
}

export async function createBookmark(uid: string, gid: string, memberId: string): Promise<UserBookmark> {
  const gc = gffftsCollection(ref(usersCollection, uid))
  const gffftRef = ref(gc, gid)
  const gffft = await getGffft(uid, gid)

  // don't confuse memberId with uid (uid is always gffft creator)
  const bc = bookmarksCollection(memberId)
  const bookmarkRef = ref(bc, gid)

  return getBookmark(uid, gid, memberId).then(async (bm) => {
    if (bm != null) {
      return bm
    }
    const bookmark = {
      name: gffft?.name,
      gffftRef: gffftRef,
      createdAt: new Date(),
    } as UserBookmark
    await upset(bookmarkRef, bookmark)
    return bookmark
  })
}

/**
 * Gets or creates a user for a given id
 * @param {string} userId user to look up
 * @return {Promise<User>}
 */
export async function getUser(userId: string): Promise<User> {
  let user = await get(usersCollection, userId).then((snapshot) => itemOrNull(snapshot))
  if (user == null) {
    user = {createdAt: new Date(),
      updatedAt: new Date()} as User
    await upset<User>(usersCollection, userId, user)
  }

  if (!user.id) {
    user.id = userId
  }

  return user
}

export async function getUserBookmarks(uid: string): Promise<UserBookmark[]> {
  const results = await all(bookmarksCollection(uid))
  const bookmarks: UserBookmark[] = []
  for (const snapshot of results) {
    const item = snapshot.data
    item.id = snapshot.ref.id
    bookmarks.push(item)
  }
  return bookmarks
}

export async function getHydratedUserBookmarks(memberId: string): Promise<HydratedUserBookmark[]> {
  const resultsPromise = all(bookmarksCollection(memberId))
  const gffftResultPromise = all(gffftsCollection(memberId))

  const bookmarks: HydratedUserBookmark[] = []
  const gffftResults = await gffftResultPromise
  for (const snapshot of gffftResults) {
    const item = snapshot.data
    item.id = snapshot.ref.id
    item.uid = memberId
    item.membership = await getGffftMembership(memberId, item.id, memberId)

    const hub: HydratedUserBookmark = {
      id: item.id,
      createdAt: item.createdAt ?? new Date(),
      gffftRef: ref(gffftsCollection(memberId), item.id),
      name: item.name,
      gffft: item,
    }
    bookmarks.push(hub)
  }

  const results = await resultsPromise
  for (const snapshot of results) {
    const item = snapshot.data
    item.id = snapshot.ref.id

    let itemFound = false
    for (const bm of bookmarks) {
      if (bm.id == item.gffftRef.id) {
        itemFound = true
        break
      }
    }

    if (!itemFound) {
      const gffft = await get<Gffft>(item.gffftRef).then((gffftSnapshot) => itemOrUndefined(gffftSnapshot))

      if (gffft && gffft.uid && gffft.id) {
        gffft.membership = await getGffftMembership(gffft.uid, item.id, memberId)
      }

      const hub: HydratedUserBookmark = {
        ...item,
        gffft: gffft,
      }
      bookmarks.push(hub)
    }
  }
  console.log(`got bookmarks:${bookmarks}`)

  return bookmarks
}

export async function getBookmark(uid: string, gid: string, memberId: string): Promise<UserBookmark|undefined> {
  const bc = bookmarksCollection(memberId)
  const bookmarkRef = ref(bc, gid)
  return get(bookmarkRef).then(itemOrUndefined)
}

export async function deleteBookmark(gid: string, memberId: string): Promise<void> {
  // don't confuse memberId with uid (uid is always gffft creator)
  const bc = bookmarksCollection(memberId)
  const bookmarkRef = ref(bc, gid)
  return remove(bookmarkRef)
}

/* eslint no-await-in-loop: "off" */
export async function getUniqueUsername(isNpc: boolean): Promise<string> {
  let counter = 0
  while (counter < 1000) {
    counter++

    // get a new username
    const generatedUsername = await getUsername()
    const npcPrefix = isNpc ? "bot-" : ""
    const username = `${npcPrefix}${generatedUsername}`

    // check to see if someone already has this username
    const existingUser = await query(usersCollection, [
      where("username", "==", username),
      limit(1),
    ]).then((results) => {
      if (results.length > 0) {
        return results[0]
      }
      return null
    })

    // no matches, use this one
    if (!existingUser) {
      return username
    }
  }
  throw new Error("unable to find a unique username")
}

export async function getUsername(): Promise<string> {
  const [noun, verb, adjective] = await Promise.all([
    getRandomItem(COLLECTION_NOUNS),
    getRandomItem(COLLECTION_VERBS),
    getRandomItem(COLLECTION_ADJECTIVES),
  ]).catch((error) => {
    console.log(`error: ${error.message}`)
    throw error
  })

  const firestore = firebaseAdmin.firestore()

  let usernameRaw

  // half the time, start with a verb. the other half start with an adjective
  if (Math.floor(Math.random() * 2) === 0) {
    usernameRaw = verb?.id + "-" + noun?.id
    await firestore
      .collection(COLLECTION_VERBS)
      .doc(verb.id)
      .set(
        {
          count: verb.get("count") ? verb.get("count") + 1 : 1,
          random: randomInt(0, 9999999),
        },
        {merge: true}
      )
  } else {
    usernameRaw = adjective.id + "-" + noun.id
    await firestore
      .collection(COLLECTION_ADJECTIVES)
      .doc(adjective.id)
      .set(
        {
          count: adjective.get("count") ? adjective.get("count") + 1 : 1,
          random: randomInt(0, 9999999),
        },
        {merge: true}
      )
  }
  await firestore
    .collection(COLLECTION_NOUNS)
    .doc(noun.id)
    .set(
      {
        count: noun.get("count") ? noun.get("count") + 1 : 1,
        random: randomInt(0, 9999999),
      },
      {merge: true}
    )
  return Promise.resolve(usernameRaw)
}

const getRandomItem = async (coll: string): Promise<QueryDocumentSnapshot<FirebaseFirestore.DocumentData>> => {
  const firestore = firebaseAdmin.firestore()

  return firestore
    .collection(coll)
    .orderBy("random", "asc")
    .offset(Math.floor(Math.random() * 500))
    .limit(1)
    .get().then((snapshot) => {
      if (snapshot.empty) {
        throw new Error(
          "unable to find random item from collection:" + collection
        )
      }
      return snapshot.docs[0]
    })
}

const addToCollection = async (coll: string, value: string): Promise<WriteResult | string> => {
  const firestore = firebaseAdmin.firestore()

  if (!value) {
    return Promise.resolve("no value")
  }
  const lineSplit = value.split(" ")
  if (lineSplit.length <= 0) {
    return Promise.resolve("no value")
  }
  const word = lineSplit[0]
  if (!word.includes("_") && !word.includes("-")) {
    return firestore.collection(coll)
      .doc(word)
      .set({
        count: 0,
        random: randomInt(1, 9999999),
      })
  }
  return Promise.resolve("word is invalid")
}

export const exportedForTesting = {
  getUsername, getRandomItem, addToCollection,
}
