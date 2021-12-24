import {QueryDocumentSnapshot} from "@google-cloud/firestore"
import * as firebaseAdmin from "firebase-admin"
import {collection, get, set, query, where, limit} from "typesaurus"
import {User} from "./models"
import UserRecord = firebaseAdmin.auth.UserRecord;

const COLLECTION_USERS = "users"
const COLLECTION_ADJECTIVES = "username_adjectives"
const COLLECTION_NOUNS = "username_nouns"
const COLLECTION_VERBS = "username_verbs"

const users = collection<User>(COLLECTION_USERS)

export interface IUserType {
  id: string;
  username: string;
}

/**
 * Serialized iam user to json
 * @param {UserRecord} iamUser user to serialize
 * @param {User} user
 * @return {IIAMUserType}
 */
export function iamUserToJson(
    iamUser: UserRecord,
    user: User
): IUserType {
  const userRecord: UserRecord = JSON.parse(JSON.stringify(iamUser))

  const item: IUserType = {
    id: userRecord.uid,
    username: user.username,
  }
  return item
}

/**
 * Gets a user from firestore if already exists
 * @param {string} userId user to look up
 * @return {IIAMUserType}
 */
export async function getUser(userId: string): Promise<User> {
  let user = await get(users, userId).then((snapshot) => {
    if (snapshot != null) {
      return snapshot.data
    }
    return null
  })
  if (user == null) {
    user = {} as User
  }
  if (user?.username == null) {
    user.username = await getUniqueUsername()
    user.usernameCounter = 0
    await set<User>(users, userId, user)
  }

  return user
}

/* eslint no-await-in-loop: "off" */
const getUniqueUsername = async () => {
  let counter = 0
  while (counter < 1000) {
    counter++

    // get a new username
    const username = await getUsername()

    // check to see if someone already has this username
    const existingUser = await query(users, [
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

const getUsername = async () => {
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

const randomInt = (low: number, high: number) => {
  return Math.floor(Math.random() * (high - low) + low)
}