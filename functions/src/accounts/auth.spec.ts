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

    await createNpc(npcId)
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
        return checkForNpc("user1234").then((result) => {
          expect(result).to.be.null
        })
      })
    })
    describe("token invalid", function() {
      it("null returned", async function() {
        return checkForNpc("npc-user1234").then((result) => {
          expect(result).to.be.null
        })
      })
    })
    describe("npc not found", function() {
      it("null returned", async function() {
        return checkForNpc("npc-token-notfound").then((result) => {
          expect(result).to.be.null
        })
      })
    })
    describe("npc found", function() {
      it("npc userId returned", async function() {
        checkForNpc(`npc-${npcId}-user1`).then((result) => {
          expect(result).to.eql("user1")
        })
      })
    })
  })
})

