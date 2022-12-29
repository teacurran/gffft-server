import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, createGffftMembership} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"
import {deleteFirestoreItem} from "../common/data"
import {getOrCreateDefaultCollection, updateCollection} from "./collection_data"
import {Collection, CollectionType} from "./collection_models"
import * as request from "superagent"
import {ICollection} from "./collection_interfaces"


chai.use(chaiHttp)
chai.should()

describe("collections API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  let uid: string
  let gid: string
  let gffft: Gffft
  let collection: Collection

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid = MOCK_AUTH_USER_1.user_id
    await getUser(uid)

    gffft = await factories.gffft.create({
      uid: uid,
      name: "Mini Golf Paradise",
      key: "mini-golf-paradise",
      enabled: false,
    })
    gid = gffft.id

    collection = await getOrCreateDefaultCollection(uid, gid, CollectionType.GALLERY)

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

  describe("unauthenticated", function() {
    function isCollectionValid(res: request.Response): request.Response {
      console.log(`collection body: ${JSON.stringify(res.body)} / ${JSON.stringify(collection)}`)
      res.should.have.status(200)
      const t = res.body as ICollection
      expect(t.name).to.equal(collection.name)
      expect(t.id).to.equal(collection.id)
      return res
    }

    it("doesn't allow me", async function() {
      return chai
        .request(server)
        .get(`/api/c/me/g/${gid}/c/invalid-gallery-id`)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    it("doesn't allow me", async function() {
      return chai
        .request(server)
        .get(`/api/c/me/g/${gid}/c/${collection.id}`)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    it("gffft does not exist", async function() {
      return chai
        .request(server)
        .get(`/api/c/${uid}/g/invalid-gid/c/${collection.id}`)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    it("collection does not exist", async function() {
      return chai
        .request(server)
        .get(`/api/c/${uid}/g/${gid}/c/invalid-cid`)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    it("gets the collection", async function() {
      return chai
        .request(server)
        .get(`/api/c/${uid}/g/${gid}/c/${collection.id}`)
        .then(isCollectionValid)
    })

    describe("collection has counts", async function() {
      collection.counts = {
        audios: 1,
        photos: 2,
        posts: 3,
        replies: 4,
        videos: 5,
      }
      await updateCollection(uid, gid, collection)
      it("gets the collection", async function() {
        return chai
          .request(server)
          .get(`/api/c/${uid}/g/${gid}/c/${collection.id}`)
          .then(isCollectionValid)
          .then((res) => {
            const t = res.body as ICollection
            expect(t.audioCount).to.equal(1)
            expect(t.photoCount).to.equal(2)
            expect(t.postCount).to.equal(3)
            expect(t.replyCount).to.equal(4)
            expect(t.videoCount).to.equal(5)
          })
      })
    })
  })
})
