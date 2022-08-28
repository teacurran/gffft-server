import "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_1_AUTH, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, DEFAULT_GFFFT_KEY, getGffftRef} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import * as firebaseAdmin from "firebase-admin"
import {COLLECTION_USERS} from "./user_data"
import {getBoardRef} from "../boards/board_data"
import {getRefPath, upset} from "typesaurus"

chai.use(chaiHttp)
chai.should()

describe("users API", function() {
  let gffft: Gffft
  let firestore: firebaseAdmin.firestore.Firestore
  let uid: string
  let gid: string

  before(async function() {
    uid = MOCK_AUTH_USER_2.user_id
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    gffft = await factories.gffft
      .create({
        uid: uid,
        name: "Lost in Space",
        key: DEFAULT_GFFFT_KEY,
        enabled: false,
      })
    gid = gffft.id

    const board = await factories.board.create({}, {transient: {uid, gid}})
    gffft.features = [getRefPath(getBoardRef(uid, gid, board.id))]
    await upset(getGffftRef(uid, gffft.id), gffft)
  })

  after(async function() {
    await firestore.collection(COLLECTION_USERS).doc(MOCK_AUTH_USER_2.user_id)
      .collection(COLLECTION_GFFFTS).doc(gffft.id)
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          await doc.ref.delete()
        }
      })
  })

  describe("/api/users/me", function() {
    describe("/users/me", function() {
      describe("unauthenticated", function() {
        it("returns 401 is me requested", async function() {
          return chai
            .request(server)
            .get("/api/users/me")
            .then((res) => {
              res.should.have.status(401)
            })
            .catch((err) => {
              throw err
            })
        })
      })

      describe("authenticated", function() {
        it("returns user information", async function() {
          return chai
            .request(server)
            .get("/api/users/me")
            .set(USER_1_AUTH)
            .then((res) => {
              res.should.have.status(200)
            })
            .catch((err) => {
              throw err
            })
        })
      })
    })
  })

  describe("/api/users/me/bookmarks", function() {
    describe("/users/me", function() {
      describe("unauthenticated", function() {
        it("returns 401 is me requested", async function() {
          return chai
            .request(server)
            .get("/api/users/me/bookmarks")
            .then((res) => {
              res.should.have.status(401)
            })
        })
      })

      describe("authenticated", function() {
        it("returns user bookmarks", async function() {
          return chai
            .request(server)
            .get("/api/users/me/bookmarks")
            .set(USER_1_AUTH)
            .then((res) => {
              res.should.have.status(200)
            })
        })
      })
    })
  })

  describe("/api/users", function() {
    describe("/users/me/gfffts/default/links/lid1", function() {
      describe("unauthenticated", function() {
        it("returns 401 is me requested", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default/links/1234")
            .then((res) => {
              res.should.have.status(401)
            })
            .catch((err) => {
              throw err
            })
        })
      })

      describe("authenticated", function() {
        it("returns 404 when gffft doesnt exist", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default/links/1234")
            .set(USER_1_AUTH)
            .then((res) => {
              res.should.have.status(404)
            })
            .catch((err) => {
              throw err
            })
        })

        it("returns 404 when link set doesnt exist", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default/links/1234")
            .set(USER_2_AUTH)
            .then((res) => {
              res.should.have.status(404)
            })
            .catch((err) => {
              throw err
            })
        })

        describe("user id is specified", function() {
          it("will create a default link set if requested", async function() {
            return chai
              .request(server)
              .get(`/api/users/${MOCK_AUTH_USER_2.user_id}/gfffts/default/links/default`)
              .set(USER_2_AUTH)
              .then((res) => {
                res.should.have.status(200)
              })
              .catch((err) => {
                throw err
              })
          })
        })

        describe("user id is 'me'", function() {
          it("will create a default link set if requested", async function() {
            return chai
              .request(server)
              .get("/api/users/me/gfffts/default/links/default")
              .set(USER_2_AUTH)
              .then((res) => {
                res.should.have.status(200)
              })
              .catch((err) => {
                throw err
              })
          })
        })
      })
    })
  })

  describe("/api/users/{uid}/gfffts/{gid}", function() {
    describe("UID is me", function() {
      describe("unauthenticated", function() {
        it("returns 401 if me requested", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default")
            .then((res) => {
              res.should.have.status(403)
            })
        })

        it("gets gffft", async function() {
          return chai
            .request(server)
            .get(`/api/users/${gffft.uid}/gfffts/${gffft.id}`)
            .then((res) => {
              res.should.have.status(200)
            })
        })
      })

      describe("authenticated", function() {
        it("gets gffft", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default")
            .set(USER_2_AUTH)
            .then((res) => {
              res.should.have.status(200)
            })
        })

        describe("gffft id is invalid", function() {
          it("returns 404", async function() {
            return chai
              .request(server)
              .get("/api/users/me/gfffts/invalid_gid")
              .set(USER_2_AUTH)
              .then((res) => res.should.have.status(404))
          })
        })
      })
    })
  })

  describe("/api/users/{uid}/gfffts/{gid}/boards/{bid}/threads", function() {
    describe("unauthenticated", function() {
      it("me returns 404", async function() {
        return chai
          .request(server)
          .get("/api/users/me/gfffts/default/boards/default/threads")
          .then((res) => {
            res.should.have.status(404)
          })
      })

      it("gets gffft", async function() {
        return chai
          .request(server)
          .get(`/api/users/${gffft.uid}/gfffts/${gffft.id}/boards/default/threads`)
          .then((res) => {
            res.should.have.status(200)
          })
      })
    })

    describe("authenticated", function() {
      it("gets board", async function() {
        return chai
          .request(server)
          .get(`/api/users/${gffft.uid}/gfffts/${gffft.id}/boards/default/threads`)
          .set(USER_2_AUTH)
          .then((res) => {
            res.should.have.status(200)
          })
      })

      it("gets board with me", async function() {
        return chai
          .request(server)
          .get(`/api/users/me/gfffts/${gffft.id}/boards/default/threads`)
          .set(USER_2_AUTH)
          .then((res) => {
            res.should.have.status(200)
          })
      })

      describe("gffft id is invalid", function() {
        it("returns 404", async function() {
          return chai
            .request(server)
            .get(`/api/users/${gffft.uid}/gfffts/invalid_gid/boards/default/threads`)
            .set(USER_2_AUTH)
            .then((res) => {
              res.should.have.status(404)
            })
        })
      })

      describe("board id is invalid", function() {
        it("returns 404", async function() {
          return chai
            .request(server)
            .get(`/api/users/${gffft.uid}/gfffts/${gffft.id}/boards/invalid_board_id/threads`)
            .set(USER_2_AUTH)
            .then((res) => {
              res.should.have.status(404)
            })
        })
      })
    })
  })
})
