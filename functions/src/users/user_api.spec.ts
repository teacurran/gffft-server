import "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit} from "../test/auth"
import server from "../server"

chai.use(chaiHttp)
chai.should()

describe("Users", function() {
  before(async function() {
    await MockFirebaseInit.getInstance().init()
  })

  describe("/api/users", function() {
    describe("/users/me/gfffts/default/links/lid1", function() {
      it("should return 404 if link does not exist", async function() {
        return chai
          .request(server)
          .get("/api/users/me/gfffts/default/links/1234")
          .then((res) => {
            res.should.have.status(404)
          })
          .catch((err) => {
            throw err
          })
      })
    })
  })
})
