import {query, subcollection, where, limit, add, pathToRef, get, upset,
  ref, Ref, Query, startAfter, order, Doc} from "typesaurus"
import {Board, HydratedThread, HydratedThreadPost, Thread, ThreadPost} from "./board_models"
import {User} from "../users/user_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {itemOrUndefined} from "../common/data"

const DEFAULT_BOARD_KEY = "default"
const DEFAULT_BOARD_NAME = "board"

export const boardsCollection = subcollection<Board, Gffft, User>("boards", gffftsCollection)
export const threadsCollection = subcollection<Thread, Board, Gffft, [string, string]>("threads", boardsCollection)
export const threadPostsCollection = subcollection<ThreadPost, Thread, Board,
  [string, string, string]>("posts", threadsCollection)

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

export async function hydrateThread(snapshot: Doc<Thread> | null): Promise<HydratedThread | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id

  const firstPostUser = await get<User>(item.firstPost).then((snapshot) => itemOrUndefined(snapshot))
  const latestPostUser = await get<User>(item.firstPost).then((snapshot) => itemOrUndefined(snapshot))

  return {
    ...item,
    firstPostUser: firstPostUser,
    latestPostUser: latestPostUser,
    posts: [],
  }
}

export async function hydrateThreadPost(snapshot: Doc<ThreadPost> | null): Promise<HydratedThreadPost | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id

  const authorUser = await get<User>(item.author).then((snapshot) => itemOrUndefined(snapshot))

  return {
    ...item,
    authorUser: authorUser,
  }
}

export async function getThreads(uid: string,
  gid: string,
  bid:string,
  offset?: string,
  maxResults = 200): Promise<HydratedThread[]> {
  const threadCollection = threadsCollection([uid, gid, bid])

  const queries: Query<Thread, keyof Thread>[] = []
  if (offset) {
    queries.push(order("updatedAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("updatedAt", "desc"))
  }
  queries.push(limit(maxResults))

  const threads: HydratedThread[] = []
  return query(threadCollection, queries).then(async (results) => {
    for (const snapshot of results) {
      const hydratedThread = await hydrateThread(snapshot)
      if (hydratedThread != null) {
        threads.push(hydratedThread)
      }
    }
    return threads
  })
}

export async function getThread(uid: string,
  gid: string,
  bid: string,
  tid: string,
  offset?: string,
  maxResults = 200): Promise<HydratedThread | null> {
  const tCollection = threadsCollection([uid, gid, bid])
  const threadRef = ref(tCollection, tid)
  const pCollection = threadPostsCollection(threadRef)

  const thread = await get(threadRef)
  const hydratedThread = await hydrateThread(thread)

  if (hydratedThread == null) {
    return null
  }

  const queries: Query<ThreadPost, keyof ThreadPost>[] = []
  if (offset) {
    queries.push(order("createdAt", "asc", [startAfter(offset)]))
  } else {
    queries.push(order("createdAt", "asc"))
  }
  queries.push(limit(maxResults))

  const results = await query(pCollection, queries)

  const posts: HydratedThreadPost[] = []
  for (const snapshot of results) {
    const hydratedThreadPost = await hydrateThreadPost(snapshot)
    if (hydratedThreadPost != null) {
      posts.push(hydratedThreadPost)
    }
  }

  hydratedThread.posts = posts

  return hydratedThread
}
