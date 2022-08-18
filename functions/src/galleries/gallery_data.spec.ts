import {expect} from "chai"
import "mocha"
import {createGffft, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {MockFirebaseInit} from "../test/auth"
import {getUser} from "../users/user_data"
import {User} from "../users/user_models"
import {galleryCollection, getGallery, getGalleryByRef,
  getGalleryByRefString, getOrCreateDefaultGallery} from "./gallery_data"
import {Gallery} from "./gallery_models"
import {ref} from "typesaurus"

describe("gallery_data", function() {
  let gffft: Gffft
  let uid1: string
  let user1: User
  let user1Handle: string
  let gallery: Gallery

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
    gallery = await getOrCreateDefaultGallery(uid1, gffft.id)
  })

  describe("getGallery", function() {
    it("is able to get gallery by id", async function() {
      const g2 = await getGallery(user1.id, gffft.id, gallery.id)
      expect(g2).to.not.be.null
      expect(g2?.key).to.eq(gallery.key)
    })
    it("default is used as id", async function() {
      const g2 = await getGallery(user1.id, gffft.id, "default")
      expect(g2).to.not.be.null
      expect(g2?.key).to.eq(gallery.key)
    })
  })

  describe("getGalleryByRef", function() {
    it("is able to get gallery by ref string", async function() {
      const gfffts = gffftsCollection(uid1)
      const galleries = galleryCollection(ref(gfffts, gffft.id))
      const g2 = await getGalleryByRef(ref(galleries, gallery.id))
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(gallery.id)
      expect(g2?.key).to.eq(gallery.key)
    }).timeout(5000)
  })

  describe("getGalleryByRefString", function() {
    it("is able to get gallery by ref string", async function() {
      const g2 = await getGalleryByRefString(`users/${uid1}/gfffts/${gffft.id}/galleries/${gallery.id}`)
      expect(g2).to.not.be.null
      expect(g2?.id).to.eq(gallery.id)
      expect(g2?.key).to.eq(gallery.key)
    }).timeout(5000)
  })
})
