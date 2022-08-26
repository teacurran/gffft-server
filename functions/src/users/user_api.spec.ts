import "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_1_AUTH, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {DEFAULT_GFFFT_KEY} from "../gfffts/gffft_data"
import {factories} from "../test/factories"

chai.use(chaiHttp)
chai.should()

describe("users API", function() {
  before(async function() {
    await MockFirebaseInit.getInstance().init()

    await factories.gffft
      .create({
        uid: MOCK_AUTH_USER_2.user_id,
        name: "Lost in Space",
        key: DEFAULT_GFFFT_KEY,
        enabled: false,
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
        it("returns 401 is me requested", async function() {
          return chai
            .request(server)
            .get("/api/users/me/gfffts/default")
            .then((res) => {
              res.should.have.status(403)
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
            .get("/api/users/me/gfffts/default")
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
