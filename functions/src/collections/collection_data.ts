import {query, where, limit, add, pathToRef, get, upset,
  ref, Ref, Query, startAfter, order, Doc, value} from "typesaurus"
import {getGffftUser} from "../gfffts/gffft_data"
import {itemOrNull} from "../common/data"
import {Link} from "../link-sets/link_set_models"
import {getLinkByRef} from "../link-sets/link_set_data"
import {AttachmentType, Collection, collectionCollection, CollectionType,
  CollectionUpdate, CollectionUpdateAudioUpset, CollectionUpdateBinaryUpset,
  CollectionUpdatePhotoUpset, CollectionUpdateTextUpset, CollectionUpdateVideoUpset,
  HydratedCollection, HydratedPost, HydratedReply, memberUpdateCollection,
  Post, postCollection, PostReaction, postReactionCollection, Reply, replyCollection,
  replyReactionCollection} from "./collection_models"

const DEFAULT_COLLECTION_KEY = "default"

export const WHO_OWNER = "owner"
export const WHO_MEMBER = "member"
export const WHO_PUBLIC = "public"

export async function getOrCreateDefaultCollection(uid: string,
  gid: string,
  type: CollectionType): Promise<Collection> {
  const userCollections = collectionCollection([uid, gid])

  let collection = await query(userCollections, [
    where("key", "==", DEFAULT_COLLECTION_KEY),
    where("type", "==", type),
    limit(1),
  ]).then(async (results) => {
    if (results.length > 0) {
      const item = results[0].data
      item.id = results[0].ref.id

      return item
    }
    return null
  })

  if (collection == null) {
    collection = {
      key: DEFAULT_COLLECTION_KEY,
      type: type,
    } as Collection
    const result = await add<Collection>(userCollections, collection)
    collection.id = result.id
  }

  return collection
}

export async function getCollection(uid: string, gid: string, cid: string): Promise<Collection | null> {
  const userCollections = collectionCollection([uid, gid])
  const itemRef = ref(userCollections, cid)
  return getBoardByRef(itemRef)
}

export async function getBoardByRef(itemRef: Ref<Collection>): Promise<Collection | null> {
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const item = snapshot.data
      item.id = snapshot.ref.id
      return item
    }
    return null
  })
}

export async function getCollectionByRefString(refId: string): Promise<Collection | null> {
  const itemRef = pathToRef<Collection>(refId)
  return getBoardByRef(itemRef)
}

export async function updateCollection(uid: string, gid: string, collection: Collection): Promise<void> {
  console.log(`updating board userId:${uid} gffftId:${gid}, collection.id: ${collection.id}`)
  const userCollections = collectionCollection([uid, gid])

  return upset<Collection>(userCollections, collection.id, collection)
}

export async function getPostReaction(uid: string, gid: string,
  cid: string, pid: string, currentUid: string): Promise<PostReaction | null> {
  const reactionCollection = postReactionCollection([uid, gid, cid, pid])
  return get(ref(reactionCollection, currentUid)).then((snapshot) => itemOrNull(snapshot))
}

export async function getReplyReaction(uid: string, gid: string,
  cid: string, pid: string, rid: string, currentUid?: string): Promise<PostReaction | null> {
  if (!currentUid) {
    return null
  }

  const reactionCollection = replyReactionCollection([uid, gid, cid, pid, rid])
  return get(ref(reactionCollection, currentUid)).then((snapshot) => itemOrNull(snapshot))
}

export async function getPosts(uid: string,
  gid: string,
  cid:string,
  offset?: string,
  maxResults = 200,
  currentUid?: string): Promise<HydratedPost[]> {
  const posts = postCollection([uid, gid, cid])

  const queries: Query<Post, keyof Post>[] = []
  queries.push(where("deleted", "==", false))
  if (offset) {
    queries.push(order("updatedAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("updatedAt", "desc"))
  }
  queries.push(limit(maxResults))

  const items: HydratedPost[] = []
  return query(posts, queries).then(async (results) => {
    for (const snapshot of results) {
      const hydratedThread = await hydratePost(uid, gid, cid, snapshot, currentUid)
      if (hydratedThread != null) {
        items.push(hydratedThread)
      }
    }
    return items
  })
}

export async function getPostByRef(itemRef: Ref<Post>): Promise<Post | null> {
  return get(itemRef).then((snapshot) => itemOrNull(snapshot))
}

export async function getPostByRefString(refId: string): Promise<Post | null> {
  const itemRef = pathToRef<Post>(refId)
  return getPostByRef(itemRef)
}

export async function getPost(uid: string,
  gid: string,
  cid: string,
  pid: string,
  offset?: string,
  maxResults = 200): Promise<HydratedPost | null> {
  const posts = postCollection([uid, gid, cid])
  const postRef = ref(posts, pid)
  const replies = replyCollection(postRef)

  const post = await get(postRef)
  const hydratedPost = await hydratePost(uid, gid, cid, post)

  if (hydratedPost == null) {
    return null
  }

  if (maxResults > 0) {
    const queries: Query<Reply, keyof Reply>[] = []
    queries.push(where("deleted", "==", false))
    if (offset) {
      queries.push(order("createdAt", "asc", [startAfter(offset)]))
    } else {
      queries.push(order("createdAt", "asc"))
    }
    queries.push(limit(maxResults))

    const results = await query(replies, queries)

    const posts: HydratedReply[] = []
    for (const snapshot of results) {
      const hydratedReply = await hydrateReply(uid, gid, cid, pid, snapshot)
      if (hydratedReply != null) {
        posts.push(hydratedReply)
      }
    }
    hydratedPost.replies = posts
  }

  return hydratedPost
}

export async function hydrateCollection(uid: string, gid: string, collection: Collection,
  items: HydratedPost[]): Promise<HydratedCollection | null> {
  if (collection == null) {
    return null
  }
  const latestPostUser = await getGffftUser(uid, gid, collection.latestPost)

  return {
    ...collection,
    latestPostUser: latestPostUser ?? undefined,
    items: items,
  }
}

export async function hydratePost(uid: string, gid: string, cid: string,
  snapshot: Doc<Post> | null, currentUid?: string): Promise<HydratedPost | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id
  const pid = item.id

  const authorUser = await getGffftUser(uid, gid, item.author)
  const latestReplyUser = await getGffftUser(uid, gid, item.latestReply)

  const reaction = await getReplyReaction(uid, gid, cid, pid, item.id, currentUid)

  return {
    ...item,
    authorUser: authorUser ?? undefined,
    latestReplyUser: latestReplyUser ?? undefined,
    replies: [],
    reaction: reaction ?? undefined,
  }
}

export async function hydrateReply(uid: string, gid: string, cid: string, pid: string,
  snapshot: Doc<Reply> | null, currentUid?: string): Promise<HydratedReply | null> {
  if (snapshot == null) {
    return null
  }
  const item = snapshot.data
  item.id = snapshot.ref.id

  const authorUser = await getGffftUser(uid, gid, item.author)

  const link: Link | null = item.linkRef ? await getLinkByRef(item.linkRef) : null

  const reaction = await getReplyReaction(uid, gid, cid, pid, item.id, currentUid)

  return {
    ...item,
    authorUser: authorUser ?? undefined,
    link: link ?? undefined,
    reaction: reaction ?? undefined,
  }
}

export async function resetCollectionUpdate(uid: string, gid: string, cid: string, memberId?: string): Promise<void> {
  if (!memberId) {
    return
  }
  const memberUpdates = memberUpdateCollection([uid, gid, cid])
  const memberUpdateRef = ref(memberUpdates, memberId)
  return resetCollectionUpdateByRef(memberUpdateRef)
}

export async function resetCollectionUpdateByRef(ref: Ref<CollectionUpdate>): Promise<void> {
  return upset<CollectionUpdate>(ref, {
    photoCount: 0,
  })
}

export async function updateCollectionUpdate(ref: Ref<CollectionUpdate>,
  type: AttachmentType, changeValue: number): Promise<void> {
  switch (type) {
  case AttachmentType.PHOTO:
    return upset<CollectionUpdatePhotoUpset>(ref, {
      photoCount: value("increment", changeValue),
    })
  case AttachmentType.VIDEO:
    return upset<CollectionUpdateVideoUpset>(ref, {
      videoCount: value("increment", changeValue),
    })
  case AttachmentType.AUDIO:
    return upset<CollectionUpdateAudioUpset>(ref, {
      audioCount: value("increment", changeValue),
    })
  case AttachmentType.BINARY:
    return upset<CollectionUpdateBinaryUpset>(ref, {
      binaryCount: value("increment", changeValue),
    })
  case AttachmentType.TEXT:
    return upset<CollectionUpdateTextUpset>(ref, {
      textCount: value("increment", changeValue),
    })
  default:
    break
  }
}

