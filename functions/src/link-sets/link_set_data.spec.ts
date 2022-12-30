import {expect} from "chai"
import {ref} from "typesaurus"
import {createGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {MockFirebaseInit, MOCK_AUTH_USER_1} from "../test/auth"
import {getUser} from "../users/user_data"
import {COLLECTION_LINKS, getLinkSetByRef, getLinkSetByRefString, getLinkSetItems,
  getOrCreateDefaultLinkSet, getOrCreateLink, linkSetCollection} from "./link_set_data"
import {Link, LinkSet} from "./link_set_models"
import * as firebaseAdmin from "firebase-admin"
import {deleteFirestoreItem} from "../common/data"

describe("link_set_data", function() {
  let firestore: firebaseAdmin.firestore.Firestore
  let gffft: Gffft
  let uid1: string
  let user1Handle: string
  let linkSet: LinkSet

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid1 = MOCK_AUTH_USER_1.user_id
    await getUser(uid1)

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
    linkSet = await getOrCreateDefaultLinkSet(uid1, gffft.id)
  })

  describe("getOrCreateDefaultLinkSet", function() {
    it("is able to get gallery by id", async function() {
      const c2 = await getOrCreateDefaultLinkSet(uid1, gffft.id)
      expect(c2).to.not.be.null
      expect(c2?.id).to.eq(linkSet.id)
      expect(c2?.key).to.eq(linkSet.key)
    })
  })

  describe("getOrCreateLink", function() {
    let link1: Link | null
    step("fetch a link", async function() {
      console.log("fetching mostly cats")
      return getOrCreateLink("https://mostlycats.pizza")
        .then((link) => {
          link1 = link
          expect(link1).to.not.be.null
        })
    })

    step("delete link", async function() {
      console.log(`link1:${link1}`)
      if (link1 != null) {
        return await firestore.collection(COLLECTION_LINKS).doc(link1.id)
          .get()
          .then(deleteFirestoreItem)
      }
    })
  })

  describe("getLinkSetByRef", function() {
    it("is able to get link set by ref", async function() {
      const gfffts = gffftsCollection(uid1)
      const collections = linkSetCollection(ref(gfffts, gffft.id))
      const g2 = await getLinkSetByRef(ref(collections, linkSet.id))
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(linkSet.id)
      expect(g2?.key).to.eq(linkSet.key)
    }).timeout(5000)
  })

  describe("getCollectionByRefString", function() {
    it("is able to get collection by ref string", async function() {
      const g2 = await getLinkSetByRefString(`users/${uid1}/gfffts/${gffft.id}/link-sets/${linkSet.id}`)
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(linkSet.id)
      expect(g2?.key).to.eq(linkSet.key)
    }).timeout(5000)
  })

  describe("getLinkSetItems", function() {
    describe("no items", function() {
      it("is gets an empty set", async function() {
        const c2 = await getLinkSetItems(uid1, gffft.id, linkSet.id)
        expect(c2).to.not.be.null
        expect(c2.length).to.eq(0)
      })
    })
  })
})
