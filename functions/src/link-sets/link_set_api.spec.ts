import {Suite} from "mocha"
import chai, {expect} from "chai"
import chaiHttp from "chai-http"
import {MockFirebaseInit, MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, MOCK_AUTH_USER_3} from "../test/auth"
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
    await createGffftMembership(uid, gid, MOCK_AUTH_USER_3.user_id, "Lisa")
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

  describe("get", function() {
    function isLinkSetValid(res: request.Response) {
      res.should.have.status(200)
      console.log(`link-set body: ${JSON.stringify(res.body)} / ${JSON.stringify(linkSet)}`)
      const t = res.body as ILinkSet
      expect(t.name).to.equal(linkSet.name)
      expect(t.id).to.equal(linkSet.id)
    }

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
})
