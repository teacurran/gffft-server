import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, USER_1_AUTH, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, createGffftMembership} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"
import {Gallery, GalleryItem} from "./gallery_models"
import {COLLECTION_GALLERIES, getGalleryItemRef} from "../galleries/gallery_data"
import {get} from "typesaurus"
import {deleteFirestoreItem} from "../common/data"
import * as request from "superagent"
import {IGallery} from "./gallery_interfaces"
import fs from "fs"

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

    gallery = await factories.gallery.create({
      name: "my favorite photos",
    }, {
      transient: {
        uid: uid,
        gid: gid,
      },
    })

    await createGffftMembership(uid, gid, MOCK_AUTH_USER_1.user_id, "ponyboy")
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

  describe("get", function() {
    function isGalleryValid(res: request.Response) {
      res.should.have.status(200)
      console.log(`gallery body: ${JSON.stringify(res.body)} / ${JSON.stringify(gallery)}`)
      const t = res.body as IGallery
      expect(t.name).to.equal(gallery.name)
      expect(t.id).to.equal(gallery.id)
    }

    describe("unauthenticated", function() {
      it("doesn't allow me", async function() {
        return chai
          .request(server)
          .get(`/api/users/me/gfffts/${gid}/galleries/invalid-gallery-id`)
          .then((res) => {
            res.should.have.status(404)
          })
      })

      it("doesn't allow me", async function() {
        return chai
          .request(server)
          .get(`/api/users/me/gfffts/${gid}/galleries/${gallery.id}`)
          .then((res) => {
            res.should.have.status(404)
          })
      })

      it("gffft does not exist", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/invalid-gid/galleries/${gallery.id}`)
          .then((res) => {
            res.should.have.status(404)
          })
      })

      it("gets the gallery", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/${gid}/galleries/${gallery.id}`)
          .then(isGalleryValid)
      })
    })

    describe("authenticated", function() {
      it("gets the gallery", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/${gid}/galleries/${gallery.id}`)
          .set(USER_1_AUTH)
          .then(isGalleryValid)
      })

      it("allows me", async function() {
        return chai
          .request(server)
          .get(`/api/users/me/gfffts/${gid}/galleries/${gallery.id}`)
          .set(USER_2_AUTH)
          .then(isGalleryValid)
      })

      describe("when gallery doesn't exist", function() {
        it("gets the gallery", async function() {
          return chai
            .request(server)
            .get(`/api/users/${uid}/gfffts/${gid}/galleries/invalid-gallery-id`)
            .set(USER_1_AUTH)
            .then((res) => {
              res.should.have.status(404)
            })
        })
      })
    })
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
      it("gets 404 when gallery doesn't exist", async function() {
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
            iid: "non-existent-gallery-item-id",
            description: updatedItemDescription,
          })
          .then(async (res) => {
            console.log(`body:${JSON.stringify(res.body)}`)
            res.should.have.status(404)
          })
      })

      it("gets 403 when item isn't owned by user", async function() {
        return chai
          .request(server)
          .patch("/api/galleries")
          .set(USER_1_AUTH)
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
            res.should.have.status(403)
          })
      })

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
      it("adds like to item", async function() {
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

      it("second request removes like", async function() {
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
            }
          })
      })

      describe("when item not found", function() {
        it("geta 404", async function() {
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

  describe("post", function() {
    const itemDesc = "photo of the lake"

    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .post("/api/galleries")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            description: itemDesc,
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      it("can't post without media", async function() {
        return chai
          .request(server)
          .post("/api/galleries")
          .set(USER_2_AUTH)
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            mid: gallery.id,
            description: itemDesc,
          })
          .then(async (res) => {
            res.should.have.status(500)
          })
      })
    })
  })

  describe("update gallery item", function() {
    let itemId: string
    const itemDesc = "photo of the lake"

    step("create item", async function() {
      return chai
        .request(server)
        .post("/api/galleries")
        .set(USER_2_AUTH)
        .set("Accept", "application/json")
        .attach("files", fs.readFileSync("src/test/avatar.png"), "avatar.png")
        .field("uid", uid)
        .field("gid", gffft.id)
        .field("mid", gallery.id)
        .field("description", itemDesc)
        .then((res) => {
          res.should.have.status(200)
          itemId = res.body["id"]
        })
    })

    step("update item", async function() {
      return chai
        .request(server)
        .patch(`/api/users/${uid}/gfffts/${gffft.id}/galleries/${gallery.id}/i/${itemId}`)
        .set(USER_2_AUTH)
        .then((res) => {
          res.should.have.status(200)
        })
    })
  })
})


