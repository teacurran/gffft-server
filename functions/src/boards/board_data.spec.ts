import {expect} from "chai"
import "mocha"
import {createGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {MockFirebaseInit} from "../test/auth"
import {ref} from "typesaurus"
import {boardsCollection, getBoardByRef, getBoardByRefString, getOrCreateDefaultBoard} from "./board_data"
import {Board} from "./board_models"

describe("board_data", function() {
  let gffft: Gffft
  let uid1: string
  let user1Handle: string
  let board: Board

  before(async function() {
    await MockFirebaseInit.getInstance().init()

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

  describe("getBoardByRef", function() {
    it("is able to get board by ref", async function() {
      const gfffts = gffftsCollection(uid1)
      const boards = boardsCollection(ref(gfffts, gffft.id))
      const g2 = await getBoardByRef(ref(boards, board.id))
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(board.id)
      expect(g2?.key).to.eq(board.key)
    }).timeout(5000)
  })

  describe("getBoardByRefString", function() {
    it("is able to get board by ref string", async function() {
      const g2 = await getBoardByRefString(`users/${uid1}/gfffts/${gffft.id}/boards/${board.id}`)
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(board.id)
      expect(g2?.key).to.eq(board.key)
    }).timeout(5000)
  })
})
