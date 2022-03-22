import {query, subcollection, where, limit, add, pathToRef, get, upset,
  ref, Ref, Query, startAfter, order, Doc} from "typesaurus"
import {Board, HydratedThread, HydratedThreadPost, Thread, ThreadPost} from "./board_models"
import {HydratedUser, User} from "../users/user_models"
import {getGffftMembership, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {itemOrNull} from "../common/data"
import {Link} from "../link-sets/link_set_models"
import {getLinkByRef} from "../link-sets/link_set_data"

const DEFAULT_BOARD_KEY = "default"
const DEFAULT_BOARD_NAME = "board"

export const WHO_OWNER = "owner"
export const WHO_PUBLIC = "public"

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

async function hydrateUser(uid: string,
  gid: string, user: User): Promise<HydratedUser | Promise<HydratedUser | null> | null> {
  const gffftMembership = await getGffftMembership(uid, gid, user.id)

  return {
    ...user,
    handle: gffftMembership ? gffftMembership.handle ?? user.id : user.id,
  }
}

export async function getGffftUser(uid: string, gid: string, userRef: Ref<User>): Promise<HydratedUser | null> {
  if (!userRef) {
    return null
  }
  const user = await get<User>(userRef).then((snapshot) => itemOrNull(snapshot))
  if (user == null) {
    return null
  }

  return hydrateUser(uid, gid, user)
}

export async function hydrateThread(uid: string, gid: string,
  snapshot: Doc<Thread> | null): Promise<HydratedThread | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id

  const firstPostUser = await getGffftUser(uid, gid, item.firstPost)
  const latestPostUser = await getGffftUser(uid, gid, item.latestPost)

  return {
    ...item,
    firstPostUser: firstPostUser ?? undefined,
    latestPostUser: latestPostUser ?? undefined,
    posts: [],
  }
}

export async function hydrateThreadPost(uid: string, gid: string,
  snapshot: Doc<ThreadPost> | null): Promise<HydratedThreadPost | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id

  const authorUser = await getGffftUser(uid, gid, item.author)

  const link: Link | null = item.linkRef ? await getLinkByRef(item.linkRef) : null

  return {
    ...item,
    authorUser: authorUser ?? undefined,
    link: link ?? undefined,
  }
}

export async function getThreads(uid: string,
  gid: string,
  bid:string,
  offset?: string,
  maxResults = 200): Promise<HydratedThread[]> {
  const threadCollection = threadsCollection([uid, gid, bid])

  const queries: Query<Thread, keyof Thread>[] = []

  // todo: add this back once the deleted field is definitely populated
  queries.push(where("deleted", "==", false))
  if (offset) {
    queries.push(order("updatedAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("updatedAt", "desc"))
  }
  queries.push(limit(maxResults))

  const threads: HydratedThread[] = []
  return query(threadCollection, queries).then(async (results) => {
    for (const snapshot of results) {
      const hydratedThread = await hydrateThread(uid, gid, snapshot)
      if (hydratedThread != null) {
        threads.push(hydratedThread)
      }
    }
    return threads
  })
}

export async function getThreadByRef(itemRef: Ref<Thread>): Promise<Thread | null> {
  return get(itemRef).then((snapshot) => itemOrNull(snapshot))
}

export async function getThreadByRefString(refId: string): Promise<Thread | null> {
  const itemRef = pathToRef<Thread>(refId)
  return getThreadByRef(itemRef)
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
  const hydratedThread = await hydrateThread(uid, gid, thread)

  if (hydratedThread == null) {
    return null
  }

  if (maxResults > 0) {
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
      const hydratedThreadPost = await hydrateThreadPost(uid, gid, snapshot)
      if (hydratedThreadPost != null) {
        posts.push(hydratedThreadPost)
      }
    }
    hydratedThread.posts = posts
  }

  return hydratedThread
}

