import "mocha"
import firebaseFunctionsTest from "firebase-functions-test"

import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {EventContextOptions} from "firebase-functions-test/lib/main"
import {Change} from "firebase-functions"
import {DocumentSnapshot} from "@google-cloud/firestore"
import {pathToRef} from "typesaurus"
import {getOrCreateDefaultBoard} from "../boards/board_data"
import {Board} from "../boards/board_models"
import {threadReplyCounter} from "./thread_reply_counter"
import {User} from "../users/user_models"
import {uuidv4} from "@firebase/util"
import {recursivelyDeleteUser} from "../test/delete_utils"

describe("thread_reply_counter", function() {
  const uid1 = uuidv4()
  const uid2 = "thread_reply_uid2"

  const gid = "gffft-1"
  const tid = "thread-id-1"
  const pid = "post-id-1"

  let board: Board

  const user1Path = `users/${uid1}`
  const user2Path = `users/${uid2}`

  let boardPath: string
  let eventParams: EventContextOptions

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    board = await getOrCreateDefaultBoard(uid1, gid)
    boardPath = `${user1Path}/gfffts/${gid}/boards/${board.id}`

    eventParams = {
      params: {
        uid: uid1,
        gid: gid,
        bid: board.id,
        tid: tid,
        pic: pid,
      },
    }
  })

  after(async function() {
    return recursivelyDeleteUser(uid1)
  })

  describe("increments thread reply counter", function() {
    const firebaseTest = firebaseFunctionsTest()

    const wrappedFn = firebaseTest.wrap(threadReplyCounter)

    const itemSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      id: "test-thread-61",
      subject: "test-subject",
      author: pathToRef<User>(user2Path),
      createdAt: new Date(),
      updatedAt: new Date(),
    }, `${boardPath}/threads/{tid}/posts/{pid}`)

    const nonExistantSnapshot = {
      exists: false,
      data() {
        return undefined
      },
      ref: itemSnapshot.ref,
    } as DocumentSnapshot

    it("handles insert", async function() {
      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(0)

      const changeEvent = firebaseTest.makeChange(
        nonExistantSnapshot,
        itemSnapshot,
      )

      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(1)

      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(2)
    })

    it("handles update", async function() {
      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(2)

      const changeEvent = {
        before: itemSnapshot,
        after: itemSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(2)
    })

    it("handles delete", async function() {
      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(2)

      const changeEvent = {
        before: itemSnapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(1)
    })

    it("neither before nor after exists", async function() {
      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(1)

      const changeEvent = {
        before: nonExistantSnapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).postCount).to.equal(1)
    })
  })
})

