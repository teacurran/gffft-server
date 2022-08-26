import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_2, USER_1_AUTH, USER_2_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, getGffft} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {assert} from "console"
import {COLLECTION_USERS, getUser} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"

chai.use(chaiHttp)
chai.should()

describe("gfffts API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  let uid: string
  let gid: string
  let gffft: Gffft

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

  describe("fruit-code", function() {
    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .put("/api/gfffts/fruit-code")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: uid,
            gid: gid,
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      it("changes the fruit code", async function() {
        const fcBefore = gffft.fruitCode
        return chai
          .request(server)
          .put("/api/gfffts/fruit-code")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: uid,
            gid: gid,
          })
          .then(async (res) => {
            res.should.have.status(200)
            const g2 = await getGffft(uid, gid)
            assert(g2?.fruitCode)
            if (g2 != null) {
              const fcAfter = g2?.fruitCode || ""
              assert(fcAfter.length > 0)
              assert(g2?.fruitCode !== fcBefore)
            }
          })
      })

      describe("user does not own gffft", function() {
        it("does not change fruitCode", async function() {
          const fcBefore = gffft.fruitCode
          return chai
            .request(server)
            .put("/api/gfffts/fruit-code")
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid,
              gid: gid,
            })
            .then(async (res) => {
              res.should.have.status(403)

              const g2 = await getGffft(uid, gid)
              assert(g2?.fruitCode)
              if (g2 != null) {
                const fcAfter = g2?.fruitCode || ""
                assert(fcAfter.length > 0)
                assert(g2?.fruitCode == fcBefore)
              }
            })
        })
      })

      describe("gffft does not exist", function() {
        it("404 code returned", async function() {
          return chai.request(server)
            .put("/api/gfffts/fruit-code")
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid,
              gid: "non-existent-gffft",
            })
            .then(async (res) => {
              res.should.have.status(404)
            })
        })
      })
    })
  })

  describe("POST", function() {
    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .post("/api/gfffts")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            name: "Clown College",
            description: "Clowns go to college!",
            initialHandle: "Clown King",
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      it("creates a new gffft", async function() {
        const name = "Dog College"
        const description = "Dogs go to college!"
        const initialHandle = "Dog King"

        return chai
          .request(server)
          .post("/api/gfffts")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            name: name,
            description: description,
            initialHandle: initialHandle,
          })
          .then(async (res) => {
            res.should.have.status(200)
            const newGid = res.body["gid"]

            const g2 = await getGffft(uid, newGid)
            expect(g2).to.not.be.null
            if (g2 != null) {
              expect(g2.name).to.eql(name)
              expect(g2.description).to.eql(description)
            }
          })
      })
    })
  })

  describe("PUT", function() {
    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .put("/api/gfffts")
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            name: "Clown College",
            description: "Clowns go to college!",
          })
          .then((res) => {
            res.should.have.status(401)
          })
      })
    })

    describe("authenticated", function() {
      const name = "Dog College"
      const description = "Dogs go to college!"

      it("updates gffft", async function() {
        return chai
          .request(server)
          .put("/api/gfffts")
          .set(USER_2_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: gffft.uid,
            gid: gffft.id,
            name: name,
            description: description,
          })
          .then(async (res) => {
            console.log(`body:${JSON.stringify(res.body)}`)
            res.should.have.status(204)

            const g2 = await getGffft(gffft.uid ?? "", gffft.id)
            expect(g2).to.not.be.null
            if (g2 != null) {
              expect(g2.name).to.eql(name)
              expect(g2.description).to.eql(description)
            }
          })
      })

      describe("gffft does not exist", function() {
        it("404 code returned", async function() {
          return chai.request(server)
            .put("/api/gfffts")
            .set(USER_2_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid,
              gid: "non-existent-gffft",
              name: name,
              description: description,
            })
            .then(async (res) => {
              res.should.have.status(404)
            })
        })
      })

      describe("board is enabled", function() {
        it("puts a board in the feature set", async function() {
          return chai
            .request(server)
            .put("/api/gfffts")
            .set(USER_2_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: gffft.uid,
              gid: gffft.id,
              name: name,
              description: description,
              boardEnabled: true,
            })
            .then(async (res) => {
              console.log(`body:${JSON.stringify(res.body)}`)
              res.should.have.status(204)

              const g2 = await getGffft(gffft.uid ?? "", gffft.id)
              expect(g2).to.not.be.null
              if (g2 != null && g2.features) {
                expect(g2.features[0]).to.contain("/boards/")
                expect(g2.name).to.eql(name)
                expect(g2.description).to.eql(description)
              }
            })
        })
      })

      describe("gallery is enabled", function() {
        it("puts a gallery in the feature set", async function() {
          return chai
            .request(server)
            .put("/api/gfffts")
            .set(USER_2_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: gffft.uid,
              gid: gffft.id,
              name: name,
              description: description,
              galleryEnabled: true,
            })
            .then(async (res) => {
              console.log(`body:${JSON.stringify(res.body)}`)
              res.should.have.status(204)

              const g2 = await getGffft(gffft.uid ?? "", gffft.id)
              expect(g2).to.not.be.null
              if (g2 != null && g2.features) {
                expect(g2.features[0]).to.contain("/galleries/")
                expect(g2.name).to.eql(name)
                expect(g2.description).to.eql(description)
              }
            })
        })
      })
    })
  })
})
