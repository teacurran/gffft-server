import "mocha"
import {MockFirebaseInit} from "../test/auth"
import {addAdjective, addNoun, addVerb, COLLECTION_ADJECTIVES, COLLECTION_BOOKMARKS,
  COLLECTION_NOUNS, COLLECTION_USERS, createBookmark, exportedForTesting, getUser} from "./user_data"
import {WriteResult} from "@google-cloud/firestore"
import {assert, expect} from "chai"
import * as firebaseAdmin from "firebase-admin"
import {uuid} from "uuidv4"
import {createGffft} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {UserBookmark} from "../users/user_models"

const {addToCollection} = exportedForTesting

describe("Users", function() {
  const TEST_COLLECTION = "test-collection"
  let firestore: firebaseAdmin.firestore.Firestore

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()
  })

  describe("addToCollection", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addToCollection(TEST_COLLECTION, "test")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        firestore.collection(TEST_COLLECTION).doc("test").get().then((doc) => {
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
        firestore.collection(COLLECTION_ADJECTIVES).doc("testAdj").get().then((doc) => {
          expect(doc.get("count")).to.equal(0)
          expect(doc.get("random")).to.be.gt(0)
        })
      }
    })
  })

  describe("addNoun", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addNoun("testNoun")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        firestore.collection(COLLECTION_NOUNS).doc("testNoun").get().then((doc) => {
          expect(doc.get("count")).to.equal(0)
          expect(doc.get("random")).to.be.gt(0)
        })
      }
    })
  })

  describe("addVerb", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addVerb("testVerb")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        firestore.collection(COLLECTION_NOUNS).doc("testVerb").get().then((doc) => {
          expect(doc.get("count")).to.equal(0)
          expect(doc.get("random")).to.be.gt(0)
        })
      }
    })
  })

  describe("createBookmark", function() {
    const uid = "cb-test-uid"
    const uid2 = "cb-test-uid2"
    let gffft: Gffft

    before(async function() {
      gffft = await createGffft(uid, {
        id: "1234",
        key: "",
        name: "Some random name",
        nameLower: "",
        enabled: false,
        allowMembers: false,
        requireApproval: false,
        enableAltHandles: false,
      }, "sysop")
    })

    it("will create a bookmark for a user", async function() {
      await createBookmark(uid, gffft.id, uid2)

      const b2Query = await firestore.collection(COLLECTION_USERS).doc(uid2)
        .collection(COLLECTION_BOOKMARKS).doc(gffft.id).get()
      expect(b2Query.exists).to.be.true

      const b2 = b2Query.data() as UserBookmark

      expect(b2.name).to.eq(gffft.name)
    })
  })

  describe("getUser", function() {
    it("will create a user that doesn't exist", async function() {
      const userId = uuid()
      firestore.collection(COLLECTION_USERS).doc(userId).get().then((doc) => {
        expect(doc.exists).to.be.false
      })
      const user = await getUser(userId)
      expect(user.id).to.equal(userId)
      expect(user.createdAt).to.not.be.null

      firestore.collection(COLLECTION_USERS).doc(userId).get().then((doc) => {
        expect(doc.exists).to.not.be.false
      })
    })
  })
})


