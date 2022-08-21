import {expect} from "chai"
import "mocha"
import {createGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {MockFirebaseInit} from "../test/auth"
import {getUser} from "../users/user_data"
import {User} from "../users/user_models"
import {getCollection, getCollectionByRef, getCollectionByRefString,
  getOrCreateDefaultCollection} from "./collection_data"
import {CollectionType, Collection, collectionCollection} from "./collection_models"
import {ref} from "typesaurus"

describe("collection_data", function() {
  let gffft: Gffft
  let uid1: string
  let user1: User
  let user1Handle: string
  let collection: Collection

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    uid1 = "test-uid-1"
    user1 = await getUser(uid1)

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
    collection = await getOrCreateDefaultCollection(uid1, gffft.id, CollectionType.FEED)
  })

  describe("getOrCreateDefaultCollection", function() {
    describe("collection type is same", function() {
      it("is able to get gallery by id", async function() {
        const c2 = await getOrCreateDefaultCollection(user1.id, gffft.id, CollectionType.FEED)
        expect(c2).to.not.be.null
        expect(c2?.id).to.eq(collection.id)
        expect(c2?.key).to.eq(collection.key)
        expect(c2?.type).to.eq(collection.type)
      })
    })

    describe("collection type different", function() {
      it("is able to get gallery by id", async function() {
        const c2 = await getOrCreateDefaultCollection(user1.id, gffft.id, CollectionType.BOARD)
        expect(c2).to.not.be.null
        expect(c2?.id).to.not.eq(collection.id)
        expect(c2?.type).to.not.eq(collection.type)

        // key should both equal default
        expect(c2?.key).to.eq(collection.key)
      })
    })
  })

  describe("getCollection", function() {
    it("is able to get gallery by id", async function() {
      const c2 = await getCollection(user1.id, gffft.id, collection.id)
      expect(c2).to.not.be.null
      expect(c2?.id).to.eq(collection.id)
      expect(c2?.key).to.eq(collection.key)
      expect(c2?.type).to.eq(collection.type)
    })
  })

  describe("getCollectionByRef", function() {
    it("is able to get collection by ref string", async function() {
      const gfffts = gffftsCollection(uid1)
      const collections = collectionCollection(ref(gfffts, gffft.id))
      const g2 = await getCollectionByRef(ref(collections, collection.id))
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(collection.id)
      expect(g2?.key).to.eq(collection.key)
    }).timeout(5000)
  })

  describe("getCollectionByRefString", function() {
    it("is able to get collection by ref string", async function() {
      const g2 = await getCollectionByRefString(`users/${uid1}/gfffts/${gffft.id}/collections/${collection.id}`)
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(collection.id)
      expect(g2?.key).to.eq(collection.key)
    }).timeout(5000)
  })
})

