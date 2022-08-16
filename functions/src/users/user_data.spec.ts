import "mocha"
import {MockFirebaseInit} from "../test/auth"
import {exportedForTesting} from "../users/user_data"
import {WriteResult} from "@google-cloud/firestore"
import {expect} from "chai"

const {addToCollection} = exportedForTesting

describe("Users", function() {
  const TEST_COLLECTION = "test-collection"

  before(async function() {
    await MockFirebaseInit.getInstance().init()
  })

  describe("addToCollection", function() {
    it("it will add an item to a collection", async function() {
      const addPromise = await addToCollection(TEST_COLLECTION, "test")
      expect(addPromise).to.be.an.instanceof(WriteResult)
    })
  })
})
