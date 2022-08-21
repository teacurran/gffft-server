import "mocha"
import firebaseFunctionsTest from "firebase-functions-test"

import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {EventContextOptions} from "firebase-functions-test/lib/main"
import {DocumentSnapshot} from "@google-cloud/firestore"
import moment from "moment"
import {GffftStats, TYPE_ADMIN, TYPE_ANON, TYPE_MEMBER, TYPE_OWNER} from "../gfffts/gffft_models"
import {getGffftStats, getGffftStatsRef} from "../gfffts/gffft_data"
import {gffftMemberCounter} from "./gffft_member_counter"
import {upset} from "typesaurus"

describe("gffftMemberCounter", function() {
  const uid = "uid-1"
  const gid = "gffft-1"
  const mid = "member-1"

  const memberPath = "users/{uid}/gfffts/{gid}/members/{mid}"
  const todayKey = moment().format("YYYY-MM-DD")
  const eventParams = {
    params: {uid, gid, mid},
  } as EventContextOptions

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    await upset<GffftStats>(getGffftStatsRef(uid, gid, todayKey), {
      id: todayKey,
      adminCount: 0,
      memberCount: 0,
      ownerCount: 0,
      anonCount: 0,
    })
  })

  describe("increments member counter", function() {
    const firebaseTest = firebaseFunctionsTest()

    const wrappedFunction = firebaseTest.wrap(gffftMemberCounter)

    const memberSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      type: TYPE_MEMBER,
    }, memberPath)

    const nonExistantSnapshot = {
      exists: false,
      data() {
        return undefined
      },
      ref: memberSnapshot.ref,
    } as DocumentSnapshot

    const newMemberChange = firebaseTest.makeChange(
      nonExistantSnapshot,
      memberSnapshot,
    )

    const adminSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      type: TYPE_ADMIN,
    }, memberPath)
    const newAdminChange = firebaseTest.makeChange(
      nonExistantSnapshot,
      adminSnapshot,
    )

    const ownerSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      type: TYPE_OWNER,
    }, memberPath)
    const newOwnerChange = firebaseTest.makeChange(
      nonExistantSnapshot,
      ownerSnapshot,
    )

    const anonSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      type: TYPE_ANON,
    }, memberPath)
    const newAnonChange = firebaseTest.makeChange(
      nonExistantSnapshot,
      anonSnapshot,
    )

    it("increments correct counter", async function() {
      const beforeStats = await getGffftStats(uid, gid, todayKey)
      expect((beforeStats).anonCount).to.equal(0)
      expect((beforeStats).adminCount).to.equal(0)
      expect((beforeStats).memberCount).to.equal(0)
      expect((beforeStats).ownerCount).to.equal(0)

      // anon 10x
      await Promise.all([...Array(10)].map(async () => wrappedFunction(newAnonChange, eventParams)))

      // admin 2x
      await Promise.all([...Array(2)].map(async () => wrappedFunction(newAdminChange, eventParams)))

      // member 20x
      await Promise.all([...Array(20)].map(async () => wrappedFunction(newMemberChange, eventParams)))

      //   // owner 3x
      await Promise.all([...Array(3)].map(async () => wrappedFunction(newOwnerChange, eventParams)))

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).anonCount).to.equal(10)
      expect((afterStats).adminCount).to.equal(2)
      expect((afterStats).memberCount).to.equal(20)
      expect((afterStats).ownerCount).to.equal(3)
    })

    it("decrements correct counter", async function() {
      const deletedOwnerChange = firebaseTest.makeChange(
        ownerSnapshot,
        nonExistantSnapshot,
      )

      await wrappedFunction(deletedOwnerChange, eventParams)

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).anonCount).to.equal(10)
      expect((afterStats).adminCount).to.equal(2)
      expect((afterStats).memberCount).to.equal(20)
      expect((afterStats).ownerCount).to.equal(2)
    })

    it("no change made", async function() {
      const typeChange = firebaseTest.makeChange(
        nonExistantSnapshot,
        nonExistantSnapshot,
      )

      await wrappedFunction(typeChange, eventParams)

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).ownerCount).to.equal(2)
    })

    it("unknown member type", async function() {
      const unknownSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
        type: "doesn't exist",
      }, memberPath)

      const unknownChange = firebaseTest.makeChange(
        nonExistantSnapshot,
        unknownSnapshot,
      )

      await wrappedFunction(unknownChange, eventParams)

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).anonCount).to.equal(10)
      expect((afterStats).adminCount).to.equal(2)
      expect((afterStats).memberCount).to.equal(20)
      expect((afterStats).ownerCount).to.equal(2)
    })

    it("member type didn't change", async function() {
      const typeChange = firebaseTest.makeChange(
        ownerSnapshot,
        ownerSnapshot,
      )

      await wrappedFunction(typeChange, eventParams)

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).ownerCount).to.equal(2)
    })

    it("changes from one type to another", async function() {
      const typeChange = firebaseTest.makeChange(
        ownerSnapshot,
        memberSnapshot,
      )

      await wrappedFunction(typeChange, eventParams)

      const afterStats = await getGffftStats(uid, gid, todayKey)
      expect((afterStats).anonCount).to.equal(10)
      expect((afterStats).adminCount).to.equal(2)
      expect((afterStats).memberCount).to.equal(21)
      expect((afterStats).ownerCount).to.equal(1)
    })
  })
})

