import {expect} from "chai"
import {Suite} from "mocha"
import {COLLECTION_GFFFTS, createGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {MockFirebaseInit} from "../test/auth"
import {ref} from "typesaurus"
import {boardsCollection, getBoard, getBoardByRef, getBoardByRefString, getOrCreateDefaultBoard} from "./board_data"
import {Board} from "./board_models"
import * as firebaseAdmin from "firebase-admin"
import { COLLECTION_USERS } from "../users/user_data"

describe("board_data", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(10000)
  let firestore: firebaseAdmin.firestore.Firestore

  let gffft: Gffft
  let uid1: string
  let user1Handle: string
  let board: Board

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid1 = "test-uid-1"

    user1Handle = "sysop"

    const gffftStub: Gffft = {
      name: "test gffft",
      description: "description of my gffft",
      intro: "some intro text",
      enabled: false,
      allowMembers: true,
      requireApproval: false,
    } as Gffft

    gffft = await createGffft(uid1, gffftStub, user1Handle)
    board = await getOrCreateDefaultBoard(uid1, gffft.id)
  })

  after(async function() {
    await firestore.collection(COLLECTION_USERS).doc(uid1)
      .collection(COLLECTION_GFFFTS).doc(gffft.id)
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          await doc.ref.delete()
        }
      })

      await firestore.collection(COLLECTION_USERS).doc(uid1)
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          await doc.ref.delete()
        }
      })
  })

  describe("getBoard", function() {
    it("is able to get board", async function() {
      const b2 = await getBoard(uid1, gffft.id, board.id)
      expect(b2).to.not.be.null
      expect(b2?.id).to.eq(board.id)
      expect(b2?.key).to.eq(board.key)
    })
  })

  describe("getBoardByRef", function() {
    it("is able to get board by ref", async function() {
      const gfffts = gffftsCollection(uid1)
      const boards = boardsCollection(ref(gfffts, gffft.id))
      const g2 = await getBoardByRef(ref(boards, board.id))
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(board.id)
      expect(g2?.key).to.eq(board.key)
    })
  })

  describe("getBoardByRefString", function() {
    it("is able to get board by ref string", async function() {
      const g2 = await getBoardByRefString(`users/${uid1}/gfffts/${gffft.id}/boards/${board.id}`)
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(board.id)
      expect(g2?.key).to.eq(board.key)
    })
  })
})
