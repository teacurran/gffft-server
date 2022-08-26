import "mocha"
import chai from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {DEFAULT_GFFFT_KEY} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import { Gffft } from "../gfffts/gffft_models"
import { getOrCreateDefaultBoard } from "./board_data"
import { Board } from "./board_models"
import { Suite } from "mocha"

chai.use(chaiHttp)
chai.should()

describe("boards API", function(this: Suite) {
  this.timeout(20000)

  let uid: string
  let gid: string
  let bid: string
  let gffft: Gffft
  let board: Board
  
  before(async function() {
    await MockFirebaseInit.getInstance().init()

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

  describe("/api/boards", function() {
    describe("/api/boards/createPost", function() {
      describe("unauthenticated", function() {
        it("returns 401", async function() {
          return chai
            .request(server)
            .post("/api/boards/createPost")
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                uid: uid,
                gid: gid,
                bid: bid,
                subject: "test subject",
                body: "test body"
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
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
              uid: uid,
              gid: gid,
              bid: bid,
              subject: "test subject",
              body: "test body"
            })
            .then((res) => {
              res.should.have.status(204)
            })
          })
      })
    })
  })
})
