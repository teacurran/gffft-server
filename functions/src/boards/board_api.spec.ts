import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, MOCK_AUTH_USER_3, USER_1_AUTH, USER_2_AUTH, USER_3_AUTH} from "../test/auth"
import server from "../server"
import {createGffftMembership, DEFAULT_GFFFT_KEY} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {getOrCreateDefaultBoard} from "./board_data"
import {Board} from "./board_models"
import * as firebaseAdmin from "firebase-admin"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import {IThread} from "./board_interfaces"
import * as request from "superagent"

chai.use(chaiHttp)
chai.should()

describe("boards API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  const uid1 = MOCK_AUTH_USER_1.user_id
  const uid2 = MOCK_AUTH_USER_2.user_id
  const uid3 = MOCK_AUTH_USER_3.user_id
  let gid: string
  let bid: string
  let gffft: Gffft
  let board: Board
  const postSubject = "test subject"
  const postBody = "test body"

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    await Promise.all([uid1, uid2, uid3].map(getUser))

    gffft = await factories.gffft.create({
      uid: uid1,
      name: "Desert Island",
      key: DEFAULT_GFFFT_KEY,
      enabled: false,
    })
    gid = gffft.id

    board = await getOrCreateDefaultBoard(uid1, gid)
    bid = board.id

    await createGffftMembership(uid1, gid, MOCK_AUTH_USER_1.user_id, "sysop")
    await createGffftMembership(uid1, gid, MOCK_AUTH_USER_2.user_id, "ponyboy")
    await createGffftMembership(uid1, gid, MOCK_AUTH_USER_3.user_id, "calcutta")
  })

  after(async function() {
    await Promise.all([uid1, uid2, uid3].map((uid) =>
      firestore.collection(COLLECTION_USERS)
        .doc(uid).get().then((doc) => firestore.recursiveDelete(doc.ref))
    ))
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
              uid: uid1,
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
              uid: uid1,
              gid: gid,
              bid: bid,
              subject: postSubject,
              body: postBody,
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

    function isThreadValid(res: request.Response) {
      res.should.have.status(200)
      console.log(res.body)
      const t = res.body as IThread
      expect(t.subject).to.equal(postSubject)
      expect(t.firstPost.id).to.equal(uid2)
    }

    step("get board", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads`)
        .set(USER_2_AUTH)
        .then((res) => {
          res.should.have.status(200)
          res.body["count"].should.equal(1)
          threadId = res.body["items"][0]["id"]
        })
    })

    step("get thread", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .set(USER_2_AUTH)
        .then(isThreadValid)
    })

    step("get thread with uid of me - no-auth", async function() {
      return chai
        .request(server)
        .get(`/api/users/me/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .then((res) => {
          res.should.have.status(403)
        })
    })

    step("get thread with uid of me - authed", async function() {
      return chai
        .request(server)
        .get(`/api/users/me/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .set(USER_1_AUTH)
        .then(isThreadValid)
    })

    step("get thread unauthenticated", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .then(isThreadValid)
    })

    step("get non-existant gffft", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/invalid-gffft/boards/${bid}/threads/${threadId}`)
        .set(USER_2_AUTH)
        .then((res2) => {
          res2.should.have.status(404)
        })
    })

    step("get non-existant board", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/invalid-board/threads/${threadId}`)
        .set(USER_2_AUTH)
        .then((res2) => {
          res2.should.have.status(404)
        })
    })

    step("get non-existant thread", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/invalid-id`)
        .set(USER_2_AUTH)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    step("try to delete a thread that doesn't exist", async function() {
      return chai
        .request(server)
        .delete(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/invalid-thread-id`)
        .set(USER_3_AUTH)
        .then((res) => {
          res.should.have.status(404)
        })
    })

    step("try to delete a thread the user does't own", async function() {
      return chai
        .request(server)
        .delete(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .set(USER_3_AUTH)
        .then((res) => {
          res.should.have.status(403)
        })
    })

    step("the gffft owner can delete the thread", async function() {
      return chai
        .request(server)
        .delete(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .set(USER_1_AUTH)
        .then((res) => {
          res.should.have.status(204)
        })
    })

    step("another post created", async function() {
      return chai
        .request(server)
        .post("/api/boards/createPost")
        .set(USER_2_AUTH)
        .set("Content-Type", "application/json")
        .send({
          uid: uid1,
          gid: gid,
          bid: bid,
          subject: postSubject,
          body: postBody,
        })
        .then((res) => {
          res.should.have.status(204)
        })
    })

    step("get board again", async function() {
      return chai
        .request(server)
        .get(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads`)
        .set(USER_2_AUTH)
        .then((res) => {
          res.should.have.status(200)
          res.body["count"].should.equal(1)
          const newThreadId = res.body["items"][0]["id"]
          expect(newThreadId).to.not.equal(threadId)
          threadId = newThreadId
        })
    })

    step("the thread owner can delete the thread", async function() {
      return chai
        .request(server)
        .delete(`/api/users/${uid1}/gfffts/${gid}/boards/${bid}/threads/${threadId}`)
        .set(USER_2_AUTH)
        .then((res) => {
          res.should.have.status(204)
        })
    })
  })
})
