import {query, where, limit, add, pathToRef, get, upset,
  ref, Ref, Query, startAfter, order, Doc, value} from "typesaurus"
import {getGffftUser} from "../gfffts/gffft_data"
import {itemOrNull} from "../common/data"
import {AttachmentType, Collection, collectionCollection, CollectionType,
  CollectionUpdate, CollectionUpdateAudioUpset, CollectionUpdateBinaryUpset,
  CollectionUpdatePhotoUpset, CollectionUpdateTextUpset, CollectionUpdateVideoUpset,
  collUpdateCollection,
  HydratedCollection, HydratedPost, Post, postCollection,
  PostReaction, postReactionCollection} from "./collection_models"

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
  ]).then(itemOrNull)

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
  return getCollectionByRef(itemRef)
}

export async function getCollectionByRef(itemRef: Ref<Collection>): Promise<Collection | null> {
  return get(itemRef).then(itemOrNull)
}

export async function getCollectionByRefString(refId: string): Promise<Collection | null> {
  const itemRef = pathToRef<Collection>(refId)
  return getCollectionByRef(itemRef)
}

export async function updateCollection(uid: string, gid: string, collection: Collection): Promise<void> {
  console.log(`updating collection userId:${uid} gffftId:${gid}, collection.id: ${collection.id}`)
  const userCollections = collectionCollection([uid, gid])

  return upset<Collection>(userCollections, collection.id, collection)
}

export async function getPostReaction(uid: string, gid: string,
  cid: string, pid: string, currentUid?: string): Promise<PostReaction | null> {
  if (!currentUid) {
    return null
  }
  const reactionCollection = postReactionCollection([uid, gid, cid, pid])
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
      const hp = await hydratePost(uid, gid, cid, snapshot, currentUid)
      if (hp != null) {
        items.push(hp)
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

  const post = await get(postRef)
  const hydratedPost = await hydratePost(uid, gid, cid, post)

  if (hydratedPost == null) {
    return null
  }

  if (maxResults > 0) {
    const queries: Query<Post, keyof Post>[] = []
    queries.push(where("parent", "==", pid))
    if (offset) {
      queries.push(order("createdAt", "asc", [startAfter(offset)]))
    } else {
      queries.push(order("createdAt", "asc"))
    }
    queries.push(limit(maxResults))

    const results = await query(posts, queries)

    const replies: HydratedPost[] = []
    for (const snapshot of results) {
      const hydratedReply = await hydratePost(uid, gid, cid, snapshot)
      if (hydratedReply != null) {
        replies.push(hydratedReply)
      }
    }
    hydratedPost.replies = replies
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

  const reaction = await getPostReaction(uid, gid, cid, pid, currentUid)

  return {
    ...item,
    authorUser: authorUser ?? undefined,
    latestReplyUser: latestReplyUser ?? undefined,
    replies: [],
    reaction: reaction ?? undefined,
  }
}

export async function resetCollectionUpdate(uid: string, gid: string, cid: string, memberId?: string): Promise<void> {
  if (!memberId) {
    return
  }
  const memberUpdates = collUpdateCollection([uid, gid, memberId])
  const memberUpdateRef = ref(memberUpdates, cid)
  return resetCollectionUpdateByRef(memberUpdateRef)
}

export async function resetCollectionUpdateByRef(ref: Ref<CollectionUpdate>): Promise<void> {
  return upset<CollectionUpdate>(ref, {
    photoCount: 0,
    videoCount: 0,
    audioCount: 0,
    binaryCount: 0,
    postCount: 0,
    replyCount: 0,
    textCount: 0,
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

