import "mocha"
import {MockFirebaseInit} from "../test/auth"
import {exportedForTesting} from "./user_data"
import {WriteResult} from "@google-cloud/firestore"
import {assert, expect} from "chai"
import * as firebaseAdmin from "firebase-admin"

const {addToCollection} = exportedForTesting

describe("Users", function() {
  const TEST_COLLECTION = "test-collection"

  before(async function() {
    await MockFirebaseInit.getInstance().init()
  })

  describe("addToCollection", function() {
    it("it will add an item to a collection", async function() {
      const addResult = await addToCollection(TEST_COLLECTION, "test")
      expect(addResult).to.be.an.instanceof(WriteResult)

      if (addResult instanceof WriteResult) {
        const firestore = firebaseAdmin.firestore()
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
})
