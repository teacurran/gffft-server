import {query, subcollection, where, limit, add, pathToRef, get, upset,
  ref, Ref, Query, startAfter, order} from "typesaurus"
import {Board, Thread, ThreadReply} from "./board_models"
import {User} from "../users/user_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"

const DEFAULT_BOARD_KEY = "default"
const DEFAULT_BOARD_NAME = "board"

export const boardsCollection = subcollection<Board, Gffft, User>("boards", gffftsCollection)
export const threadsCollection = subcollection<Thread, Board, Gffft, [string, string]>("threads", boardsCollection)
export const threadRepliesCollection = subcollection<ThreadReply, Thread, Board,
  [string, string, string]>("replies", threadsCollection)

/**
 * gets or creates the default board for a user
 * @param {string} userId
 * @param {string} gffftId
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultBoard(userId: string, gffftId: string): Promise<Board> {
  const userBoards = boardsCollection([userId, gffftId])

  let board = await query(userBoards, [
    where("key", "==", DEFAULT_BOARD_KEY),
    limit(1),
  ]).then(async (results) => {
    if (results.length > 0) {
      const item = results[0].data
      item.id = results[0].ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_BOARD_NAME
        await updateBoard(userId, gffftId, item)
      }
      return item
    }
    return null
  })

  if (board == null) {
    board = {
      key: DEFAULT_BOARD_KEY,
      name: DEFAULT_BOARD_NAME,
    } as Board
    const result = await add<Board>(userBoards, board)
    board.id = result.id
  }

  return board
}

export async function getBoard(uid: string, gid: string, bid: string): Promise<Board | null> {
  const userBoards = boardsCollection([uid, gid])
  const itemRef = ref(userBoards, bid)
  return getBoardByRef(itemRef)
}

export async function getBoardByRef(itemRef: Ref<Board>): Promise<Board | null> {
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const item = snapshot.data
      item.id = snapshot.ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_BOARD_NAME
        await upset<Board>(itemRef, item)
      }

      return item
    }
    return null
  })
}

export async function getBoardByRefString(refId: string): Promise<Board | null> {
  const itemRef = pathToRef<Board>(refId)
  return getBoardByRef(itemRef)
}

export async function updateBoard(userId: string, gffftId: string, board: Board): Promise<void> {
  console.log(`updating board userId:${userId} gffftId:${gffftId}, boardId: ${board.id}`)
  const userBoards = boardsCollection([userId, gffftId])

  return upset<Board>(userBoards, board.id, board)
}

export async function getThreads(uid: string,
  gid: string,
  bid:string,
  offset?: string,
  maxResults = 200): Promise<Thread[]> {
  const threadCollection = threadsCollection([uid, gid, bid])

  const queries: Query<Thread, keyof Thread>[] = []
  if (offset) {
    queries.push(order("updatedAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("updatedAt", "desc"))
  }

  queries.push(limit(maxResults))

  const threads: Thread[] = []
  return query(threadCollection, queries).then((results) => {
    results.forEach((item) => {
      threads.push(item.data)
    })
    return threads
  })
}


