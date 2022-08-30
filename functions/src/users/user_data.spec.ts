import "mocha"
import {MockFirebaseInit} from "../test/auth"
import {
  addAdjective,
  addNoun,
  addVerb,
  COLLECTION_ADJECTIVES,
  COLLECTION_BOOKMARKS,
  COLLECTION_NOUNS,
  COLLECTION_USERS,
  createBookmark,
  deleteBookmark,
  exportedForTesting,
  getUniqueUsername,
  getUser,
  getUserBookmarks,
  getUsername,
} from "./user_data"
import {WriteResult} from "@google-cloud/firestore"
import {assert, expect} from "chai"
import * as firebaseAdmin from "firebase-admin"
import {uuid} from "uuidv4"
import {Gffft} from "../gfffts/gffft_models"
import {UserBookmark} from "../users/user_models"
import {factories} from "../test/factories"

const {addToCollection} = exportedForTesting

describe("users_data", function() {
  const TEST_COLLECTION = "test-collection"
  const testTerm = "test"

  let firestore: firebaseAdmin.firestore.Firestore

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()
  })

  after(async function() {
    await firestore.collection(TEST_COLLECTION).doc(testTerm)
      .get()
      .then((snapshot) => {
        return firestore.recursiveDelete(snapshot.ref)
      })
  })

  describe("addToCollection", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addToCollection(TEST_COLLECTION, "test")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        firestore
          .collection(TEST_COLLECTION)
          .doc("test")
          .get()
          .then((doc) => {
            expect(doc.get("count")).to.equal(0)
            expect(doc.get("random")).to.be.gt(0)
          })
      }
    })

    describe("when value is null", function() {
      it("it will return without adding anything", async function() {
        const addResult = await addToCollection(TEST_COLLECTION, "")
        assert(typeof addResult == "string")
        expect(addResult).to.eq("no value")
      })
    })

    describe("when value is empty", function() {
      it("it will return without adding anything", async function() {
        const addResult = await addToCollection(TEST_COLLECTION, "   ")
        assert(typeof addResult == "string")
        expect(addResult).to.eq("word is invalid")
      })
    })

    describe("when value is invalid", function() {
      it("it will return without adding anything", async function() {
        const addResult = await addToCollection(TEST_COLLECTION, "invalid-word")
        assert(typeof addResult == "string")
        expect(addResult).to.eq("word is invalid")

        const addResult2 = await addToCollection(TEST_COLLECTION, "invalid_word")
        assert(typeof addResult2 == "string")
        expect(addResult2).to.eq("word is invalid")
      })
    })
  })

  describe("addAdjective", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addAdjective("testAdj")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        return firestore
          .collection(COLLECTION_ADJECTIVES)
          .doc("testAdj")
          .get()
          .then((doc) => {
            expect(doc.get("count")).to.equal(0)
            expect(doc.get("random")).to.be.gt(0)
            return doc.ref.delete()
          })
      }
    })
  })

  describe("addNoun", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addNoun("testNoun")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        return firestore
          .collection(COLLECTION_NOUNS)
          .doc("testNoun")
          .get()
          .then((doc) => {
            expect(doc.get("count")).to.equal(0)
            expect(doc.get("random")).to.be.gt(0)
            return doc.ref.delete()
          })
      }
    })
  })

  describe("addVerb", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addVerb("testVerb")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        firestore
          .collection(COLLECTION_NOUNS)
          .doc("testVerb")
          .get()
          .then((doc) => {
            expect(doc.get("count")).to.equal(0)
            expect(doc.get("random")).to.be.gt(0)
            return doc.ref.delete()
          })
      }
    })
  })

  describe("createBookmark", function() {
    const uid1 = "cb-test-uid"
    const uid2 = "cb-test-uid2"
    let gffft: Gffft

    before(async function() {
      gffft = await factories.gffft.create({uid: uid1, name: "Bookmark City", key: "", enabled: false})
    })

    after(async function() {
      await Promise.all([uid1, uid2].map((uid) =>
        firestore.collection(COLLECTION_USERS)
          .doc(uid).get().then((doc) => firestore.recursiveDelete(doc.ref))
      ))
    })

    it("will create a bookmark for a user", async function() {
      await createBookmark(uid1, gffft.id, uid2)

      const b2Query = await firestore
        .collection(COLLECTION_USERS)
        .doc(uid2)
        .collection(COLLECTION_BOOKMARKS)
        .doc(gffft.id)
        .get()
      expect(b2Query.exists).to.be.true

      const b2 = b2Query.data() as UserBookmark

      expect(b2.name).to.eq(gffft.name)
    })

    it("will create not set name for an unknown bookmark", async function() {
      const nonExistantGffftId = "non-existant-gffft"
      await createBookmark(uid1, nonExistantGffftId, uid2)

      const b2Query = await firestore
        .collection(COLLECTION_USERS)
        .doc(uid2)
        .collection(COLLECTION_BOOKMARKS)
        .doc(nonExistantGffftId)
        .get()
      expect(b2Query.exists).to.be.true

      const b2 = b2Query.data() as UserBookmark

      expect(b2.name).to.be.null
    })
  })

  describe("getUser", function() {
    it("will create a user that doesn't exist", async function() {
      const userId = uuid()
      await firestore
        .collection(COLLECTION_USERS)
        .doc(userId)
        .get()
        .then((doc) => {
          expect(doc.exists).to.be.false
        })
      const user = await getUser(userId)
      expect(user.id).to.equal(userId)
      expect(user.createdAt).to.not.be.null

      await firestore
        .collection(COLLECTION_USERS)
        .doc(userId)
        .get()
        .then((doc) => {
          expect(doc.exists).to.not.be.false
          return doc.ref.delete()
        })
    })
  })

  describe("getUserBookmarks", function() {
    const uid1 = "cb-test-uid"
    const uid2 = "cb-test-uid2"
    const gid1 = "cb-test-gid1"

    const gid2 = "cb-test-gid2"
    const userId2 = "cb-test-uid4"
    let gffft: Gffft

    before(async function() {
      gffft = await factories.gffft.create({uid: uid1, name: "Salads", key: "", enabled: false})
    })

    after(async function() {
      await Promise.all([uid1, uid2, userId2].map((uid) =>
        firestore.collection(COLLECTION_USERS + "3")
          .doc(uid).get().then((doc) => firestore.recursiveDelete(doc.ref))
      ))
    })

    it("will create a bookmark for a user", async function() {
      const actorId = uuid()

      await createBookmark(uid1, gffft.id, actorId)
      await createBookmark(uid2, gid2, actorId)
      await createBookmark(uid1, gffft.id, userId2)
      await createBookmark(uid2, gid2, userId2)

      const bookmarks = await getUserBookmarks(actorId)
      expect(bookmarks).to.not.be.empty

      bookmarks.forEach((b) => {
        console.log(`bookmark: ${JSON.stringify(b)}`)
      })

      expect(bookmarks.length).to.eq(2)

      bookmarks.forEach((b) => {
        if (b.id == gffft.id) {
          expect(b.name).to.eq(gffft.name)
        } else {
          expect(b.name).to.be.null
        }
      })
    })

    describe("deleteBookmark", function() {
      const actorId = "deleteBookmarkActor"

      after(async function() {
        return firestore.collection(COLLECTION_USERS).doc(actorId)
          .get()
          .then((doc) => firestore.recursiveDelete(doc.ref))
      })

      it("will create a bookmark for a user", async function() {
        await createBookmark(uid1, gid1, actorId)
        await createBookmark(uid2, gid2, actorId)
        await createBookmark(uid1, uid2, userId2)
        await createBookmark(uid2, gid2, userId2)

        const bookmarks = await getUserBookmarks(actorId)
        bookmarks.forEach((b) => {
          console.log(`bookmark: ${JSON.stringify(b)}`)
        })
        expect(bookmarks).to.not.be.empty
        expect(bookmarks.length).to.eq(2)

        await deleteBookmark(gid1, actorId)
        const bookmarks2 = await getUserBookmarks(actorId)
        expect(bookmarks2).to.not.be.empty
        expect(bookmarks2.length).to.eq(1)
      })
    })

    describe("getUsername", function() {
      const adjectives = ["avenged", "calibrated", "cantering", "embolic", "malted", "mythic", "normative", "official", "parabolic", "septic"]
      const verbs = ["abetted", "bagged", "barred", "chapping", "chiselled", "chugged", "forspoken", "overshot", "scarred", "scramming"]
      const nouns = ["adulator", "adult", "aster", "basketeer", "bomber", "carhop", "cinch", "kayak", "lead", "machine"]

      before(async function() {
        await Promise.all(adjectives.map((word) => addAdjective(word)))
        await Promise.all(verbs.map((word) => addVerb(word)))
        await Promise.all(nouns.map((word) => addNoun(word)))
      })

      describe("getUsername", function() {
        const usernames = [] as string[]
        [...Array(10)].forEach(async () => {
          const username = await getUsername()

          expect(usernames).to.not.include(username)
          usernames.push(username)

          const unSplit = username.split("-")
          expect(unSplit.length).to.eq(2)

          expect([...adjectives, ...verbs]).to.include(unSplit[0])
          expect(nouns).to.include(unSplit[1])
        })
      })

      describe("getUniqueUsername", function() {
        const usernames = [] as string[]
        [...Array(10)].forEach(async () => {
          const username = await getUniqueUsername(false)

          expect(usernames).to.not.include(username)
          usernames.push(username)

          const unSplit = username.split("-")
          expect(unSplit.length).to.eq(2)

          expect([...adjectives, ...verbs]).to.include(unSplit[0])
          expect(nouns).to.include(unSplit[1])
        })
      })

      describe("getUniqueBotUsername", function() {
        const usernames = [] as string[]
        [...Array(10)].forEach(async () => {
          const username = await getUniqueUsername(true)

          expect(usernames).to.not.include(username)
          usernames.push(username)

          const unSplit = username.split("-")
          expect(unSplit.length).to.eq(3)

          expect(unSplit[0]).to.eq("bot")
          expect([...adjectives, ...verbs]).to.include(unSplit[1])
          expect(nouns).to.include(unSplit[2])
        })
      })
    })
  })
})
