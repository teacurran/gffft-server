import "mocha"
import {MockFirebaseInit} from "../test/auth"
import {exportedForTesting} from "../users/user_data"
import assert from "assert"
import {WriteResult} from "@google-cloud/firestore"

const {addToCollection} = exportedForTesting

describe("Users", function() {
  const TEST_COLLECTION = "test-collection"

  before(async function() {
    await MockFirebaseInit.getInstance().init()
  })

  describe("addToCollection", function() {
    it("it will add an item to a collection", async function() {
      const addPromise = await addToCollection(TEST_COLLECTION, "test")
      assert.equal(typeof addPromise, WriteResult)
    })
  })
})
