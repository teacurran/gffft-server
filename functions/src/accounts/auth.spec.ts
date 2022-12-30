import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit} from "../test/auth"
import * as firebaseAdmin from "firebase-admin"
import {deleteFirestoreItem} from "../common/data"
import {checkForNpc} from "./auth"
import {COLLECTION_NPCS, createNpc} from "./npcs/data"

chai.use(chaiHttp)
chai.should()

describe("auth", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  const npcId = "npc1234"

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    createNpc(npcId)
  })

  after(async function() {
    return firestore.collection(COLLECTION_NPCS)
      .doc(npcId)
      .get()
      .then(deleteFirestoreItem)
  })

  describe("checkForNpc", function() {
    describe("doesn't start with npc-", function() {
      it("null returned", async function() {
        expect(checkForNpc("user1234")).to.be.null
      })
    })
    describe("token invalid", function() {
      it("null returned", async function() {
        expect(checkForNpc("npc-token")).to.be.null
      })
    })
    describe("npc not found", function() {
      it("null returned", async function() {
        expect(checkForNpc("npc-token-notfound")).to.be.null
      })
    })
    describe("npc found", function() {
      it("npc userId returned", async function() {
        expect(checkForNpc(`npc-${npcId}-user1`)).to.eql("user1")
      })
    })
  })
})

