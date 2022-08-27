import "mocha"
import {
  checkGffftHandle,
  createGffft,
  createGffftMembership,
  DEFAULT_GFFFT_KEY,
  deleteGffftMembership,
  getDefaultGffft,
  getFullGffft,
  getGffft,
  getGffftByRef,
  getGffftMembership,
  getGffftRef,
  getGfffts,
  getOrCreateGffftMembership,
  getUniqueFruitCode,
  hydrateGffft,
  updateGffft,
} from "./gffft_data"
import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {Gffft, TYPE_ANON, TYPE_MEMBER} from "./gffft_models"
import {User} from "../users/user_models"
import {getUser} from "../users/user_data"
import {factories} from "../test/factories"
import {LinkSet} from "../link-sets/link_set_models"
import {getRefPath, upset} from "typesaurus"
import {getLinkSetRef} from "../link-sets/link_set_data"

describe("gffft_data", function() {
  let gffft: Gffft
  let uid1: string
  let user1: User
  let uid2: string
  let user2: User
  let user1Handle: string
  let user2Handle: string

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    uid1 = "gffft_data-uid-1"
    user1 = await getUser(uid1)

    uid2 = "gffft_data-uid-2"
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

  describe("checkGffftHandle", function() {
    it("user2 cannot have user1's handle", async function() {
      const result = await checkGffftHandle(user1.id, gffft.id, user2.id, user1Handle)
      expect(result).to.be.false
    })

    it("a user can have thier own handle", async function() {
      const result = await checkGffftHandle(user1.id, gffft.id, user1.id, user1Handle)
      expect(result).to.be.true
    })

    it("a user can have an untaken handle", async function() {
      const result = await checkGffftHandle(user1.id, gffft.id, user1.id, "unique_special_handle")
      expect(result).to.be.true
    })
  })

  describe("createGffftMembership", function() {
    user2Handle = "peaches"

    it("creates membership", async function() {
      const membership = await createGffftMembership(user1.id, gffft.id, user2.id, user2Handle)
      expect(membership).to.not.be.null
      const updatedAt = membership.updatedAt
      await new Promise((r) => setTimeout(r, 1000))

      const m2 = await createGffftMembership(user1.id, gffft.id, user2.id, user2Handle)
      expect(m2).to.not.be.null
      expect(m2.updatedAt).to.eql(updatedAt)
    })

    it("lets users update their handle", async function() {
      const user2HandleUpdated = "grapefruit"
      const membership = await createGffftMembership(user1.id, gffft.id, user2.id, user2Handle)
      expect(membership).to.not.be.null
      const updatedAt = membership.updatedAt
      await new Promise((r) => setTimeout(r, 1000))

      const m2 = await createGffftMembership(user1.id, gffft.id, user2.id, user2HandleUpdated)
      expect(m2).to.not.be.null
      expect(m2.updatedAt).to.not.eql(updatedAt)
    })

    describe("deleteGffftMembership", function() {
      it("deletes membership", async function() {
        const reloaded1 = await getGffftMembership(user1.id, gffft.id, user2.id)
        expect(reloaded1).to.not.be.null

        await deleteGffftMembership(user1.id, gffft.id, user2.id)

        const reloaded2 = await getGffftMembership(user1.id, gffft.id, user2.id)
        expect(reloaded2).to.be.undefined
      })
    })
  })

  describe("getDefaultGffft", function() {
    let g1: Gffft
    let g2: Gffft
    let g3: Gffft
    before(async function() {
      g1 = await factories.gffft.create({uid: user1.id, name: "Deer Park", key: DEFAULT_GFFFT_KEY, enabled: false})
      g2 = await factories.gffft.create({uid: user1.id, name: "Scorpion Lake", key: "scorpion-lake", enabled: false})
      g3 = await factories.gffft.create({uid: user1.id, name: "Taco Grove", key: "taco-grove", enabled: false})
    })

    it("gets the default gffft for a user", async function() {
      expect(g2.id).to.not.eql(g1.id)
      expect(g3.id).to.not.eql(g1.id)

      const gffft = await getDefaultGffft(user1.id)
      expect(gffft).to.not.be.null
      if (gffft) {
        expect(gffft.id).to.eql(g1.id)
      }
    })
  })

  describe("getFullGffft", function() {
    it("returns a hydrated gffft", async function() {
      const g2 = await getFullGffft(uid1, gffft.id)
      expect(g2).to.not.be.null
      if (g2) {
        expect(gffft.id).to.eql(gffft.id)
        expect(gffft.name).to.eql(gffft.name)
        expect(gffft.description).to.eql(gffft.description)
        expect(gffft.intro).to.eql(gffft.intro)
        expect(gffft.enabled).to.eql(gffft.enabled)
        expect(gffft.allowMembers).to.eql(gffft.allowMembers)
        expect(gffft.requireApproval).to.eql(gffft.requireApproval)
      }
    })
  })

  describe("getGffftByRef", function() {
    it("returns a gffft", async function() {
      const g2 = await getGffftByRef(`users/${uid1}/gfffts/${gffft.id}`)
      expect(g2).to.not.be.null
      if (g2) {
        expect(gffft.id).to.eql(gffft.id)
        expect(gffft.name).to.eql(gffft.name)
        expect(gffft.description).to.eql(gffft.description)
        expect(gffft.intro).to.eql(gffft.intro)
        expect(gffft.enabled).to.eql(gffft.enabled)
        expect(gffft.allowMembers).to.eql(gffft.allowMembers)
        expect(gffft.requireApproval).to.eql(gffft.requireApproval)
      }
    })
  })

  describe("getOrCreateGffftMembership", function() {
    it("creates anonymous membership", async function() {
      const user3Id = "test-uid-3"
      const membership = await getOrCreateGffftMembership(user1.id, gffft.id, user3Id)
      expect(membership).to.not.be.null
      const updatedAt = membership.updatedAt
      await new Promise((r) => setTimeout(r, 1000))

      const m2 = await getOrCreateGffftMembership(user1.id, gffft.id, user3Id)
      expect(m2).to.not.be.null
      expect(m2.type).to.eql(TYPE_ANON)
      expect(m2.updatedAt).to.eql(updatedAt)
    })

    it("upgrades anonymous users to members", async function() {
      const user4Id = "test-uid-4"

      const membership = await getOrCreateGffftMembership(user1.id, gffft.id, user4Id)
      expect(membership).to.not.be.null
      const updatedAt = membership.updatedAt
      await new Promise((r) => setTimeout(r, 1000))

      const m2 = await createGffftMembership(user1.id, gffft.id, user4Id, "sunflower")
      expect(m2).to.not.be.null
      expect(m2.type).to.eql(TYPE_MEMBER)
      expect(m2.updatedAt).to.not.eql(updatedAt)
    })
  })

  describe("getGffftMembership", function() {
    it("returns empty if member id is empty", async function() {
      const membership = await getGffftMembership(user1.id, gffft.id, "")
      expect(membership).to.be.undefined
    })
  })

  describe("getGfffts", function() {
    let g1: Gffft
    let g2: Gffft
    let g3: Gffft
    before(async function() {
      g1 = await factories.gffft.create({name: "Deer Park", fruitCode: "🍑🍒🥥🍇🍋🍌🫐🍊🍎"})
      g2 = await factories.gffft.create({name: "Deer Lake", fruitCode: "🫐🥝🍉🍐🥥🥥🥭🍎🍌"})
      g3 = await factories.gffft.create({name: "Taco Grove", fruitCode: "🍎🍉🍒🍎🍏🍑🥥🍋🍊"})
    })

    describe("no parameters passed in", function() {
      it("returns all gfffts", async function() {
        const gfffts = await getGfffts()
        expect(gfffts).to.be.an("array")

        expect(gfffts.length).to.eql(3)
        expect(gfffts).to.have.deep.members([g1, g2, g3])
      })
    })

    describe("offset parameter", function() {
      it("returns gfffts after the offset", async function() {
        const gfffts = await getGfffts("Deer Lake")
        expect(gfffts).to.be.an("array")
        expect(gfffts.length).to.eql(2)

        expect(gfffts).to.have.deep.members([g1, g3])
      })
    })

    describe("q parameter", function() {
      it("searches by name prefix", async function() {
        const gfffts = await getGfffts(undefined, 20, "Taco")

        expect(gfffts).to.be.an("array")
        expect(gfffts.length).to.eql(1)

        expect(gfffts).to.have.deep.members([g3])
      })

      it("with an offset", async function() {
        const gfffts = await getGfffts("Deer Lake", 20, "Deer")

        expect(gfffts).to.be.an("array")
        expect(gfffts.length).to.eql(1)

        expect(gfffts).to.have.deep.members([g1])
      })

      it("searches by name suffix", async function() {
        const gfffts = await getGfffts(undefined, 20, "Lake")

        expect(gfffts).to.be.an("array")

        // suffix not implemnted
        expect(gfffts.length).to.eql(0)
      })

      it("searches by mid-name", async function() {
        const gfffts = await getGfffts(undefined, 20, "eer Par")

        expect(gfffts).to.be.an("array")

        // mid-name not implemented
        expect(gfffts.length).to.eql(0)
      })

      it("searches by fruit-code", async function() {
        const gfffts = await getGfffts(undefined, 20, "🫐🥝🍉🍐🥥🥥🥭🍎🍌")

        expect(gfffts).to.be.an("array")
        expect(gfffts.length).to.eql(1)
        expect(gfffts).to.have.deep.members([g2])
      })

      it("searches by fruit-code when prefix contains exclamation", async function() {
        const allGfffts = await getGfffts()
        allGfffts.forEach((gffft) => {
          console.log(`all gffft id:${gffft.id} name:${gffft.name} fruit:${gffft.fruitCode}`)
        })

        const gfffts = await getGfffts(undefined, 20, "here is a prefix! 🍎🍉🍒🍎🍏🍑🥥🍋🍊")

        expect(gfffts).to.be.an("array")
        expect(gfffts.length).to.eql(1)
        expect(gfffts).to.have.deep.members([g3])
      })
    })
  })

  describe("getUniqueFruitCode", function() {
    it("it randomly generates fruit codes", async function() {
      const fruitCodes: string[] = []
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

  describe("hydrateGffft", function() {
    let linkSet: LinkSet

    before(async function() {
      linkSet = await factories.linkSet.create({}, {
        transient: {
          uid: uid1,
          gid: gffft.id,
        },
      })
    })

    it("hydrates link set", async function() {
      const itemRef = getRefPath(getLinkSetRef(uid1, gffft.id, linkSet.id))
      gffft.features = [itemRef]
      await upset(getGffftRef(uid1, gffft.id), gffft)

      const hydrated = await hydrateGffft(uid1, gffft)
      expect(hydrated.linkSets).to.be.an("array")
      expect(hydrated.linkSets.length).to.eql(1)
    })
  })

  describe("updateGffft", function() {
    it("updates the nameLower field", async function() {
      gffft.name = "All City Lunch"

      await updateGffft(uid1, gffft.id, gffft)

      const g1Reloaded = await getGffft(uid1, gffft.id)
      expect(g1Reloaded).to.not.be.null
      if (g1Reloaded) {
        expect(g1Reloaded.nameLower).to.eql("all city lunch")
      }
    })
  })
})
