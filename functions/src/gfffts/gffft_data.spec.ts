import "mocha"
import {checkGffftHandle, createGffft, getUniqueFruitCode} from "./gffft_data"
import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {Gffft} from "./gffft_models"
import {User} from "../users/user_models"
import {getUser} from "../users/user_data"

describe("gffft_data", function() {
  let gffft: Gffft
  let uid1: string
  let user1: User
  let uid2: string
  let user2: User
  let user1Handle: string

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    uid1 = "test-uid-1"
    user1 = await getUser(uid1)

    uid2 = "test-uid-2"
    user2 = await getUser(uid2)

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
  })

  describe("getUniqueFruitCode", function() {
    it("it randomly generates fruit codes", async function() {
      const fruitCodes:string[] = []
      let rareCount = 0
      for (let i = 0; i < 100; i++) {
        const [code, rareFruits] = await getUniqueFruitCode()
        if (fruitCodes.includes(code)) {
          throw new Error(`Duplicate code: ${code}`)
        }
        rareCount += rareFruits
        fruitCodes.push(code)
      }
      // this can fail, it is random. increasing loop above will reduce
      expect(rareCount).to.be.gt(0)
    })
  })

  describe("checkGffftHandle", function() {
    it("user2 cannot have user1's handle", async function() {
      const result = await checkGffftHandle(user1.id, gffft.id, user2.id, user1Handle)
      expect(result).to.be.false
    }).timeout(5000)

    it("a user can have thier own handle", async function() {
      const result = await checkGffftHandle(user1.id, gffft.id, user1.id, user1Handle)
      expect(result).to.be.false
    }).timeout(5000)
  })
})
