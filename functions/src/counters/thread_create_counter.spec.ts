import "mocha"
import firebaseFunctionsTest from "firebase-functions-test"

import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {getUser} from "../users/user_data"
import {EventContextOptions} from "firebase-functions-test/lib/main"
import {Change} from "firebase-functions"
import {DocumentSnapshot} from "@google-cloud/firestore"
import {upset, pathToRef} from "typesaurus"
import {getOrCreateDefaultBoard} from "../boards/board_data"
import {Board, BoardThreadCounter} from "../boards/board_models"
import {threadCreateCounter} from "./thread_create_counter"
import {User} from "../users/user_models"

describe("thread_create_counter", function() {
  const uid1 = "thread_create_uid"
  const gid = "gffft-1"
  const iid = "item-1"
  let board: Board
  const userPath = `users/${uid1}`
  let boardPath: string

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    await getUser(uid1)

    board = await getOrCreateDefaultBoard(uid1, gid)
    boardPath = `${userPath}/gfffts/${gid}/boards/${board.id}`

    await upset<BoardThreadCounter>(pathToRef<Board>(boardPath), {
      threadCount: 0,
      updatedAt: new Date(),
    })
  })

  describe("increments thread counter", function() {
    const firebaseTest = firebaseFunctionsTest()

    const wrappedFn = firebaseTest.wrap(threadCreateCounter)

    const itemSnapshot = firebaseTest.firestore.makeDocumentSnapshot({
      id: "test-thread-61",
      subject: "test-subject",
      firstPost: pathToRef<User>(userPath),
      latestPost: pathToRef<User>(userPath),
      postCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    }, `${boardPath}/threads/{tid}`)

    const nonExistantSnapshot = {
      exists: false,
      data() {
        return undefined
      },
      ref: itemSnapshot.ref,
    } as DocumentSnapshot

    it("handles insert", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          bid: board.id,
          tid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(0)

      const changeEvent = firebaseTest.makeChange(
        nonExistantSnapshot,
        itemSnapshot,
      )

      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(1)

      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(2)
    })

    it("handles update", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          bid: board.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(2)

      const changeEvent = {
        before: itemSnapshot,
        after: itemSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(2)
    })

    it("handles delete", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          bid: board.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(2)

      const changeEvent = {
        before: itemSnapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(1)
    })

    it("neither before nor after exists", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          bid: board.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(1)

      const changeEvent = {
        before: nonExistantSnapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedFn(changeEvent, eventParams)

      expect((await getOrCreateDefaultBoard(uid1, gid)).threadCount).to.equal(1)
    })
  })
})

