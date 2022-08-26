import {Suite} from "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, DEFAULT_GFFFT_KEY} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {getOrCreateDefaultBoard} from "./board_data"
import {Board} from "./board_models"
import * as firebaseAdmin from "firebase-admin"
import {COLLECTION_USERS} from "../users/user_data"

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

    uid = MOCK_AUTH_USER_2.user_id

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
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          await doc.ref.delete()
        }
      })

    await firestore.collection(COLLECTION_USERS).doc(uid)
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          await doc.ref.delete()
        }
      })
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
})
