import {Suite} from "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, DEFAULT_GFFFT_KEY} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {COLLECTION_BOARDS, COLLECTION_POSTS, COLLECTION_THREADS, getOrCreateDefaultBoard} from "./board_data"
import {Board} from "./board_models"
import * as firebaseAdmin from "firebase-admin"
import {COLLECTION_USERS} from "../users/user_data"
import {deleteFirestoreItem} from "../common/data"

chai.use(chaiHttp)
chai.should()

describe("boards API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  let uid: string
  let gid: string
  let bid: string
  let gffft: Gffft
  let board: Board

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid = MOCK_AUTH_USER_1.user_id

    gffft = await factories.gffft.create({
      uid: uid,
      name: "Desert Island",
      key: DEFAULT_GFFFT_KEY,
      enabled: false,
    })
    gid = gffft.id

    board = await getOrCreateDefaultBoard(uid, gid)
    bid = board.id
  })

  after(async function() {
    await firestore.collection(COLLECTION_USERS).doc(uid)
      .collection(COLLECTION_GFFFTS).doc(gid)
      .collection(COLLECTION_BOARDS).doc(bid)
      .collection(COLLECTION_THREADS)
      .get()
      .then((snapshot) => {
        snapshot.forEach(async (doc) => {
          await firestore.collection(COLLECTION_USERS).doc(uid)
            .collection(COLLECTION_GFFFTS).doc(gid)
            .collection(COLLECTION_BOARDS).doc(bid)
            .collection(COLLECTION_THREADS).doc(doc.id)
            .collection(COLLECTION_POSTS)
            .get()
            .then(deleteFirestoreItem)

          deleteFirestoreItem(doc)
        })
      })

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .collection(COLLECTION_GFFFTS).doc(gid)
      .collection(COLLECTION_BOARDS).doc(bid)
      .get()
      .then(deleteFirestoreItem)

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .collection(COLLECTION_GFFFTS).doc(gid)
      .collection(COLLECTION_BOARDS).doc(bid)
      .get()
      .then(deleteFirestoreItem)

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .collection(COLLECTION_GFFFTS).doc(gid)
      .get()
      .then(deleteFirestoreItem)

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .get()
      .then(deleteFirestoreItem)
  })

  describe("/api/boards", function() {
    describe("/api/boards/createPost", function() {
      describe("unauthenticated", function() {
        it("returns 401", async function() {
          return chai
            .request(server)
            .post("/api/boards/createPost")
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid,
              gid: gid,
              bid: bid,
              subject: "test subject",
              body: "test body",
            })
            .then((res) => {
              res.should.have.status(401)
            })
        })
      })

      describe("authenticated", function() {
        it("creates board post", async function() {
          return chai
            .request(server)
            .post("/api/boards/createPost")
            .set(USER_2_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid,
              gid: gid,
              bid: bid,
              subject: "test subject",
              body: "test body",
            })
            .then((res) => {
              res.should.have.status(204)
            })
        })
      })
    })
  })

  describe("get post", function() {
    let threadId: string

    step("get board", function() {
      it("gets threads", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/${gid}/boards/${bid}/threads`)
          .set(USER_2_AUTH)
          .then((res) => {
            res.should.have.status(200)
            res.body["count"].should.equal(1)
            threadId = res.body["items"][0]["id"]
          })
      })
    })

    step("get thread", function() {
      it("gets a single thread", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
          .set(USER_2_AUTH)
          .then((res2) => {
            res2.should.have.status(200)
          })
      })
    })
  })
})
