import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, MOCK_AUTH_USER_3, USER_1_AUTH, USER_3_AUTH} from "../test/auth"
import server from "../server"
import {COLLECTION_GFFFTS, createGffftMembership, getGffft, getGffftMembership} from "../gfffts/gffft_data"
import {factories} from "../test/factories"
import {Gffft} from "../gfffts/gffft_models"
import {assert} from "console"
import {COLLECTION_USERS, getUser, getUserBookmarks} from "../users/user_data"
import * as firebaseAdmin from "firebase-admin"

chai.use(chaiHttp)
chai.should()

describe("gfffts API", function(this: Suite) {
  // eslint-disable-next-line no-invalid-this
  this.timeout(20000)
  let firestore: firebaseAdmin.firestore.Firestore

  const user2Handle = "ponyboy"
  let uid1: string
  let uid2: string
  let uid3: string
  let gid: string
  let gffft: Gffft

  before(async function() {
    await MockFirebaseInit.getInstance().init()
    firestore = firebaseAdmin.firestore()

    uid1 = MOCK_AUTH_USER_1.user_id
    uid2 = MOCK_AUTH_USER_2.user_id
    uid3 = MOCK_AUTH_USER_3.user_id
    await getUser(uid1)
    await getUser(uid2)

    gffft = await factories.gffft.create({
      uid: uid1,
      name: "Mini Golf Paradise",
      key: "mini-golf-paradise",
      enabled: false,
    })
    gid = gffft.id

    createGffftMembership(uid1, gid, uid2, user2Handle)
  })

  after(async function() {
    await firestore.collection(COLLECTION_USERS).doc(uid1)
      .collection(COLLECTION_GFFFTS)
      .get()
      .then((snapshot) => {
        snapshot.forEach(async (doc) => {
          await firestore.recursiveDelete(doc.ref)
        })
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
            uid: uid2,
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
          .set(USER_1_AUTH)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .send({
            uid: uid1,
            gid: gid,
          })
          .then(async (res) => {
            res.should.have.status(200)
            const g2 = await getGffft(uid2, gid)
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
            .set(USER_3_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid1,
              gid: gid,
            })
            .then(async (res) => {
              res.should.have.status(403)

              const g2 = await getGffft(uid1, gid)
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
              uid: uid2,
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
          .set(USER_1_AUTH)
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

            const g2 = await getGffft(uid1, newGid)
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
          .set(USER_1_AUTH)
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
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid2,
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
            .set(USER_1_AUTH)
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
            .set(USER_1_AUTH)
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

  describe("PATCH", function() {
    describe("unauthenticated", function() {
      it("returns 401", async function() {
        return chai
          .request(server)
          .patch("/api/gfffts")
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
      const name = "Patches Basketball Team"
      const description = "It's not in the rules, but it's a team!"

      it("updates gffft", async function() {
        return chai
          .request(server)
          .patch("/api/gfffts")
          .set(USER_1_AUTH)
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
            .patch("/api/gfffts")
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: uid2,
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
            .patch("/api/gfffts")
            .set(USER_1_AUTH)
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
                // position #1 is set to galleries in the test above ^
                expect(g2.features[1]).to.contain("/boards/")
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
            .patch("/api/gfffts")
            .set(USER_1_AUTH)
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
                console.log(`g2.features[0]:${g2.features[0]}`)
                console.log(`g2.features[1]:${g2.features[1]}`)

                // sending a gallery enabled patch will put the gallery second
                expect(g2.features[1]).to.contain("/galleries/")
                expect(g2.name).to.eql(name)
                expect(g2.description).to.eql(description)
              }
            })
        })
      })

      describe("link set is enabled", function() {
        it("puts a gallery in the feature set", async function() {
          return chai
            .request(server)
            .patch("/api/gfffts")
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: gffft.uid,
              gid: gffft.id,
              linkSetEnabled: true,
            })
            .then(async (res) => {
              res.should.have.status(204)

              const g2 = await getGffft(gffft.uid ?? "", gffft.id)
              expect(g2).to.not.be.null
              if (g2 != null && g2.features) {
                console.log(`g2.features[0]:${g2.features[0]}`)
                console.log(`g2.features[1]:${g2.features[1]}`)
                console.log(`g2.features[2]:${g2.features[2]}`)

                // sending a gallery enabled patch will put the gallery second
                expect(g2.features[2]).to.contain("/link-sets/")
                expect(g2.name).to.eql(name)
                expect(g2.description).to.eql(description)
              }
            })
        })
      })

      describe("fruit-code is enabled", function() {
        it("puts a gallery in the feature set", async function() {
          return chai
            .request(server)
            .patch("/api/gfffts")
            .set(USER_1_AUTH)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send({
              uid: gffft.uid,
              gid: gffft.id,
              fruitCodeEnabled: true,
            })
            .then(async (res) => {
              res.should.have.status(204)

              const g2 = await getGffft(gffft.uid ?? "", gffft.id)
              expect(g2).to.not.be.null
              if (g2 != null && g2.features) {
                expect(g2.features[3]).to.eql("fruitCode")
                expect(g2.name).to.eql(name)
                expect(g2.description).to.eql(description)
              }
            })
        })
      })
    })
  })

  describe("POST /me/gfffts/membership", function() {
    const user3Handle = "magikarp"

    step("handle is already taken", function() {
      return chai
        .request(server)
        .post("/api/users/me/gfffts/membership")
        .set(USER_3_AUTH)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send({
          uid: gffft.uid,
          gid: gffft.id,
          handle: user2Handle,
        }).then(async (res) => {
          console.log(`membership body:${JSON.stringify(res.body)}`)
          res.should.have.status(400)
        })
    })

    step("user is allowed to join", function() {
      return chai
        .request(server)
        .post("/api/users/me/gfffts/membership")
        .set(USER_3_AUTH)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send({
          uid: gffft.uid,
          gid: gffft.id,
          handle: user3Handle,
        }).then(async (res) => {
          res.should.have.status(204)

          const m2 = await getGffftMembership(uid1, gid, uid3)
          expect(m2).to.not.be.undefined
          expect(m2?.handle).to.eql(user3Handle)
        })
    })

    step("user is allowed to delete membership", function() {
      return chai
        .request(server)
        .delete("/api/users/me/gfffts/membership")
        .set(USER_3_AUTH)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send({
          uid: gffft.uid,
          gid: gffft.id,
        }).then(async (res) => {
          res.should.have.status(204)

          const m2 = await getGffftMembership(uid1, gid, uid3)
          expect(m2).to.be.undefined
        })
    })
  })

  describe("POST /me/gfffts/bookmarks", function() {
    it("let's a user create a bookmark", async function() {
      return chai
        .request(server)
        .post("/api/users/me/bookmarks")
        .set(USER_3_AUTH)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send({
          uid: gffft.uid,
          gid: gffft.id,
        }).then(async (res) => {
          res.should.have.status(204)

          const b2 = await getUserBookmarks(uid3)
          console.log(`b2:${JSON.stringify(b2)}`)
        })
    })

    it("returns 404 for non-existant gffft", async function() {
      return chai
        .request(server)
        .post("/api/users/me/bookmarks")
        .set(USER_3_AUTH)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send({
          uid: gffft.uid,
          gid: "doesn't exist",
        }).then(async (res) => {
          res.should.have.status(404)
        })
    })
  })
})
