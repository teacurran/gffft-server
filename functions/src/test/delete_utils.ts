import {COLLECTION_USERS} from "../users/user_data"
import {COLLECTION_GFFFTS} from "../gfffts/gffft_data"
import * as firebaseAdmin from "firebase-admin"

export async function recursivelyDeleteUser(uid: string): Promise<void> {
  const firestore = firebaseAdmin.firestore()

  return firestore.collection(COLLECTION_USERS).doc(uid)
    .get()
    .then((snapshot) => {
      return firestore.recursiveDelete(snapshot.ref)
    })
}

export async function recursivelyDeleteGfffts(uid: string): Promise<void> {
  const firestore = firebaseAdmin.firestore()

  return firestore.collection(COLLECTION_USERS).doc(uid)
    .collection(COLLECTION_GFFFTS)
    .get()
    .then((snapshot) => {
      snapshot.forEach(async (doc) => {
        await firestore.recursiveDelete(doc.ref)
      })
    })
}
