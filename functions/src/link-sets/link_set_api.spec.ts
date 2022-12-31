import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, MOCK_AUTH_USER_3, USER_1_AUTH, USER_3_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, createGffftMembership} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"
import {deleteFirestoreItem} from "../common/data"
import * as request from "superagent"
import {LinkSet} from "./link_set_models"
import {ILinkSet} from "./link_set_interfaces"
import {COLLECTION_LINK_SETS} from "./link_set_data"

chai.use(chaiHttp)
chai.should()

describe("link set API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  let uid: string
  let gid: string
  let gffft: Gffft
  let linkSet: LinkSet

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid = MOCK_AUTH_USER_1.user_id
    await getUser(uid)
    await getUser(MOCK_AUTH_USER_2.user_id)
    await getUser(MOCK_AUTH_USER_3.user_id)

    gffft = await factories.gffft.create({
      uid: uid,
      name: "Mini Golf Paradise",
      key: "mini-golf-paradise",
      enabled: false,
    })
    gid = gffft.id

    linkSet = await factories.linkSet.create({}, {
      transient: {
        uid: uid,
        gid: gid,
      },
    })

    await createGffftMembership(uid, gid, MOCK_AUTH_USER_1.user_id, "Sysop")
    await createGffftMembership(uid, gid, MOCK_AUTH_USER_2.user_id, "Michael")
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

  function isLinkSetValid(res: request.Response) {
    res.should.have.status(200)
    console.log(`link-set body: ${JSON.stringify(res.body)} / ${JSON.stringify(linkSet)}`)
    const t = res.body as ILinkSet
    expect(t.name).to.equal(linkSet.name)
    expect(t.id).to.equal(linkSet.id)
  }

  describe("get link", function() {
    describe("unauthenticated", function() {
      it("allows request", async function() {
        return chai
          .request(server)
          .get("/api/links/link?url=https://google.com")
          .then((res) => {
            res.should.have.status(200)
          })
      })
      describe("link is null", function() {
        it("returns an error", async function() {
          return chai
            .request(server)
            .get("/api/links/link?url=")
            .then((res) => {
              res.should.have.status(400)
            })
        })
      })
      describe("link is invalid", function() {
        it("returns an error", async function() {
          return chai
            .request(server)
            .get("/api/links/link?url=this+is+not+a_valid_domainx")
            .then((res) => {
              res.should.have.status(500)
            })
        })
      })
    })
  })

  describe("get", function() {
    describe("unauthenticated", function() {
      it("doesn't allow me", async function() {
        return chai
          .request(server)
          .get(`/api/users/me/gfffts/${gid}/links/${linkSet.id}`)
          .then((res) => {
            res.should.have.status(401)
          })
      })

      it("gffft does not exist", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/invalid-gid/links/${linkSet.id}`)
          .then((res) => {
            res.should.have.status(404)
          })
      })

      it("gets the link set", async function() {
        return chai
          .request(server)
          .get(`/api/users/${uid}/gfffts/${gid}/links/${linkSet.id}`)
          .then(isLinkSetValid)
      })
    })
  })

  describe("post", function() {
    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .post("/api/links")
          .send({
            uid: "me",
            gid: gid,
            lid: "default",
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })

      describe("authenticated", function() {
        describe("gffft is invalid", function() {
          it("doesn't create link", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_1_AUTH)
              .send({
                uid: "me",
                gid: "invlid gid",
                lid: "default",
                url: "https://www.google.com",
              })
              .then((res) => {
                res.should.have.status(404)
              })
          })
        })

        describe("lid is invalid", function() {
          it("doesn't create link", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_1_AUTH)
              .send({
                uid: "me",
                gid: gid,
                lid: "invalid-lid",
                url: "https://www.google.com",
              })
              .then((res) => {
                res.should.have.status(404)
              })
          })
        })

        describe("user is not a member", function() {
          it("doesn't create link", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_3_AUTH)
              .send({
                uid: "me",
                gid: gid,
                lid: "default",
                url: "https://www.bing.com",
              })
              .then((res) => {
                res.should.have.status(404)
              })
          })
        })

        describe("link is invalid", function() {
          it("doesn't create link", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_1_AUTH)
              .send({
                uid: "me",
                gid: gid,
                lid: "invalid-lid",
                url: "https://non-existant-domain.spam",
              })
              .then((res) => {
                res.should.have.status(404)
              })
          })
        })

        describe("link is valid", function() {
          let firstLinkId: string
          step("create link", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_1_AUTH)
              .send({
                uid: "me",
                gid: gid,
                lid: "default",
                url: "https://www.google.com",
              })
              .then((res) => {
                console.log(`link body: ${JSON.stringify(res.body)}`)
                res.should.have.status(200)
              })
          })

          step("create link with uid", async function() {
            return chai
              .request(server)
              .post("/api/links")
              .set(USER_1_AUTH)
              .send({
                uid: MOCK_AUTH_USER_1.user_id,
                gid: gid,
                lid: "default",
                url: "https://www.mostlycats.org",
              })
              .then((res) => {
                console.log(`link body: ${JSON.stringify(res.body)}`)
                res.should.have.status(200)
              })
          })

          step("get link set", async function() {
            return chai
              .request(server)
              .get(`/api/users/${MOCK_AUTH_USER_1.user_id}/gfffts/${gid}/links/default`)
              .set(USER_1_AUTH)
              .then((res) => {
                console.log(`link set body: ${JSON.stringify(res.body)}`)
                res.should.have.status(200)
                expect(res.body["items"].length).to.eql(2)
                firstLinkId = res.body["items"][0]["id"]
              })
          })

          step("get link set with offset", async function() {
            console.log(`calling with offset: ${firstLinkId}`)
            return chai
              .request(server)
              .get(`/api/users/${MOCK_AUTH_USER_1.user_id}/gfffts/${gid}/links/default`)
              .query({
                offset: firstLinkId,
              })
              .set(USER_1_AUTH)
              .then((res) => {
                console.log(`link set body: ${JSON.stringify(res.body)}`)
                res.should.have.status(200)
                expect(res.body["items"].length).to.eql(1)
              })
          })

          step("delete link set", async function() {
            await firestore.collection(COLLECTION_USERS).doc(uid)
              .collection(COLLECTION_GFFFTS).doc(gid)
              .collection(COLLECTION_LINK_SETS)
              .get()
              .then((snapshot) => {
                snapshot.forEach(async (doc) => {
                  await firestore.recursiveDelete(doc.ref)
                })
              })
          })
        })
      })
    })
  })
})
