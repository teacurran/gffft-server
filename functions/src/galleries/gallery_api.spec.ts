import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"
import {Gallery, GalleryItem} from "./gallery_models"
import {COLLECTION_GALLERIES, getGalleryItemRef} from "../galleries/gallery_data"
import {get} from "typesaurus"
import {deleteFirestoreItem} from "../common/data"

chai.use(chaiHttp)
chai.should()

describe("galleries API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  let uid: string
  let gid: string
  let gffft: Gffft
  let gallery: Gallery

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid = MOCK_AUTH_USER_2.user_id
    await getUser(uid)

    gffft = await factories.gffft.create({
      uid: uid,
      name: "Mini Golf Paradise",
      key: "mini-golf-paradise",
      enabled: false,
    })
    gid = gffft.id

    gallery = await factories.gallery.create({}, {
      transient: {
        uid: uid,
        gid: gid,
      },
    })
  })

  after(async function() {
    await firestore.collection(COLLECTION_USERS).doc(uid)
      .collection(COLLECTION_GFFFTS).doc(gid)
      .get()
      .then(deleteFirestoreItem)

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .get()
      .then(deleteFirestoreItem)
  })

  describe("PATCH", function() {
    let galleryItem: GalleryItem
    const updatedItemDescription = "updated gallery item description"

    before(async function() {
      galleryItem = await factories.galleryItem.create({}, {
        transient: {
          uid: uid,
          gid: gid,
          mid: gallery.id,
        },
      })
    })

    after(async function() {
      await firestore.collection(COLLECTION_USERS).doc(uid)
        .collection(COLLECTION_GFFFTS).doc(gid)
        .collection(COLLECTION_GALLERIES).doc(gallery.id)
        .get()
        .then(deleteFirestoreItem)
    })

    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .patch("/api/galleries")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            iid: galleryItem.id,
            description: updatedItemDescription,
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      it("updates gallery", async function() {
        return chai
          .request(server)
          .patch("/api/galleries")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            iid: galleryItem.id,
            description: updatedItemDescription,
          })
          .then(async (res) => {
            console.log(`body:${JSON.stringify(res.body)}`)
            res.should.have.status(200)

            const item2 = await get(getGalleryItemRef(uid, gid, gallery.id, galleryItem.id))
            expect(item2).to.not.be.null
            if (item2 != null) {
              expect(item2.data.description).to.eql(updatedItemDescription)
            }
          })
      })
    })
  })

  describe("like", function() {
    let galleryItem: GalleryItem

    before(async function() {
      galleryItem = await factories.galleryItem.create({}, {
        transient: {
          uid: uid,
          gid: gid,
          mid: gallery.id,
        },
      })
    })

    after(async function() {
      await firestore.collection(COLLECTION_USERS).doc(uid)
        .collection(COLLECTION_GFFFTS).doc(gid)
        .collection(COLLECTION_GALLERIES).doc(gallery.id)
        .get()
        .then(deleteFirestoreItem)
    })

    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .post("/api/galleries/like")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            iid: galleryItem.id,
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      it("updates gallery", async function() {
        return chai
          .request(server)
          .post("/api/galleries/like")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            iid: galleryItem.id,
          })
          .then(async (res) => {
            res.should.have.status(200)

            const item2 = await get(getGalleryItemRef(uid, gid, gallery.id, galleryItem.id))
            expect(item2).to.not.be.null
            if (item2 != null) {
              expect(item2.data.likes).to.not.be.null
              if (item2.data.likes != null) {
                expect(item2.data.likes[0]).to.eql(uid)
                expect(item2.data.likeCount).to.eql(1)
              }
            }
          })
      })

      it("double like does nothing", async function() {
        return chai
          .request(server)
          .post("/api/galleries/like")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            iid: galleryItem.id,
          })
          .then(async (res) => {
            res.should.have.status(200)

            const item2 = await get(getGalleryItemRef(uid, gid, gallery.id, galleryItem.id))
            expect(item2).to.not.be.null
            if (item2 != null) {
              expect(item2.data.likes).to.not.be.null
              if (item2.data.likes != null) {
                expect(item2.data.likes.length).to.eql(0)
              }
            }
          })
      })

      describe("when item not found", function() {
        it("updates gallery", async function() {
          return chai
            .request(server)
            .post("/api/galleries/like")
            .set(USER_2_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: gffft.uid,
              gid: gffft.id,
              mid: gallery.id,
              iid: "non-existant item",
            })
            .then(async (res) => {
              res.should.have.status(404)
            })
        })
      })
    })
  })
})


