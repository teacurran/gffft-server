import {QueryDocumentSnapshot, WriteResult} from "@google-cloud/firestore"
import * as firebaseAdmin from "firebase-admin"
import {collection, get, set, query, where, limit, subcollection, all, ref, upset} from "typesaurus"
import {itemOrNull} from "../common/data"
import {randomInt} from "../common/utils"
import {getGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {HydratedUserBookmark, User, UserBookmark} from "./user_models"

export const COLLECTION_USERS = "users"
export const COLLECTION_ADJECTIVES = "username_adjectives"
export const COLLECTION_NOUNS = "username_nouns"
export const COLLECTION_VERBS = "username_verbs"

export const usersCollection = collection<User>("users")
export const bookmarksCollection = subcollection<UserBookmark, User>("bookmarks", usersCollection)


/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {IIAMUserType}
 */
export async function getUser(userId: string): Promise<User> {
  let user = await get(usersCollection, userId).then((snapshot) => {
    if (snapshot != null) {
      return snapshot.data
    }
    return null
  })
  if (user == null) {
    user = {} as User
  }
  if (user?.username == null) {
    user.username = await getUniqueUsername(userId.startsWith("npc#"))
    user.usernameCounter = 0
    user.createdAt = new Date()
    user.updatedAt = new Date()
    await set<User>(usersCollection, userId, user)
  }

  return user
}

export const addAdjective = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_ADJECTIVES, value)
}

export const addNoun = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_NOUNS, value)
}

export const addVerb = async (value: string): Promise<WriteResult | string> => {
  return addToCollection(COLLECTION_VERBS, value)
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

export async function getHydratedUserBookmarks(uid: string): Promise<HydratedUserBookmark[]> {
  const results = await all(bookmarksCollection(uid))
  const bookmarks: HydratedUserBookmark[] = []

  for (const snapshot of results) {
    const item = snapshot.data
    item.id = snapshot.ref.id

    const gffft = await get<Gffft>(item.gffftRef).then((snapshot) => itemOrNull(snapshot))

    const hub: HydratedUserBookmark = {
      ...item,
      gffft: gffft,
    }
    bookmarks.push(hub)
  }
  console.log(`got bookmarks:${bookmarks}`)

  return bookmarks
}

export async function createBookmark(uid: string, gid: string, memberId: string): Promise<UserBookmark> {
  const gc = gffftsCollection(uid)
  const gffftRef = ref(gc, gid)
  const gffft = await getGffft(uid, gid)

  // don't confuse memberId with uid (uid is always gffft creator)
  const bc = bookmarksCollection(memberId)
  const bookmarkRef = ref(bc, gid)

  return get(bookmarkRef).then(async (snapshot) => {
    if (snapshot != null) {
      return snapshot.data
    } else {
      const bookmark = {
        name: gffft?.name,
        gffftRef: gffftRef,
        createdAt: new Date(),
      } as UserBookmark
      await upset(bookmarkRef, bookmark)
      return bookmark
    }
  })
}

/* eslint no-await-in-loop: "off" */
async function getUniqueUsername(isNpc: boolean) {
  let counter = 0
  while (counter < 1000) {
    counter++

    // get a new username
    const generatedUsername = await getUsername()
    const npcPrefix = isNpc ? "npc-" : ""
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

async function getUsername() {
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
  return usernameRaw
}

const getRandomItem = async (collection: string): Promise<QueryDocumentSnapshot<FirebaseFirestore.DocumentData>> => {
  const firestore = firebaseAdmin.firestore()

  return firestore
    .collection(collection)
    .orderBy("random", "asc")
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

const addToCollection = async (collection: string, value: string): Promise<WriteResult | string> => {
  const firestore = firebaseAdmin.firestore()

  if (!value) {
    return Promise.resolve("no value")
  }
  console.log(`line: ${value}`)
  const lineSplit = Array.isArray(value) ? value : value.split(" ")
  if (lineSplit.length <= 0) {
    return Promise.resolve("no value")
  }
  const word = lineSplit[0]
  console.log(`word: ${word}`)
  if (!word.includes("_") && !word.includes("-")) {
    return firestore.collection(collection)
      .doc(word)
      .set({
        count: 0,
        random: randomInt(0, 9999999),
      })
  }
  return Promise.resolve("word is invalid")
}
