import {add, Doc, get, limit, order, pathToRef, Query, query, Ref, ref, startAfter,
  subcollection, where} from "typesaurus"
import {itemOrUndefined} from "../common/data"
import {gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {usersCollection} from "../users/user_data"
import {User} from "../users/user_models"
import {HydratedLinkSet, HydratedLinkSetItem, LinkSet, LinkSetItem} from "./link_set_models"

const DEFAULT_LINK_SET_KEY = "default"

export const linkSetCollection = subcollection<LinkSet, Gffft, User>("link-sets", gffftsCollection)
export const linkSetItemsCollection = subcollection<LinkSetItem, LinkSet,
  Gffft, [string, string]>("items", linkSetCollection)

export async function getLinkSetByRef(itemRef: Ref<LinkSet>): Promise<LinkSet | null> {
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const data = snapshot.data
      data.id = snapshot.ref.id
      return data
    }
    return null
  })
}

export async function getLinkSetByRefString(refId: string): Promise<LinkSet | null> {
  const itemRef = pathToRef<LinkSet>(refId)
  return getLinkSetByRef(itemRef)
}

export async function getOrCreateDefaultLinkSet(uid: string, gid: string): Promise<LinkSet> {
  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const linkSets = linkSetCollection(ref(gfffts, gid))

  let linkSet = await query(linkSets, [
    where("key", "==", DEFAULT_LINK_SET_KEY),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      const value = results[0].data
      value.id = results[0].ref.id
      return value
    }
    return null
  })

  if (linkSet == null) {
    linkSet = {
      key: DEFAULT_LINK_SET_KEY,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LinkSet
    const result = await add<LinkSet>(linkSets, linkSet)
    linkSet.id = result.id
  }

  return linkSet
}

export async function getLinkSet(uid: string, gid: string, lid: string): Promise<LinkSet | null> {
  if (lid == "default") {
    return getOrCreateDefaultLinkSet(uid, gid)
  }

  console.log(`looking for link set: uid:${uid} gid:${gid} mid:${lid}`)

  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const linkSets = linkSetCollection(ref(gfffts, gid))
  const itemRef = ref(linkSets, lid)
  console.log(`itemRef: ${JSON.stringify(itemRef)}`)
  return getLinkSetByRef(itemRef)
}

export async function getLinkSetItems(uid: string,
  gid: string,
  mid:string,
  offset?: string,
  maxResults = 200): Promise<HydratedLinkSetItem[]> {
  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const linkSets = linkSetCollection(ref(gfffts, gid))
  const linkSetRef = ref(linkSets, mid)
  const linkSetItems = linkSetItemsCollection(linkSetRef)

  const queries: Query<LinkSetItem, keyof LinkSetItem>[] = []
  if (offset) {
    queries.push(order("createdAt", "desc", [startAfter(offset)]))
  } else {
    queries.push(order("createdAt", "desc"))
  }
  queries.push(limit(maxResults))

  const items: HydratedLinkSetItem[] = []
  return query(linkSetItems, queries).then(async (results) => {
    for (const snapshot of results) {
      const hydratedItem = await hydrateLinkSetItem(snapshot)
      if (hydratedItem != null) {
        items.push(hydratedItem)
      }
    }
    return items
  })
}

export async function hydrateLinkSetItem(snapshot: Doc<LinkSetItem> |
    LinkSetItem |
    null): Promise<HydratedLinkSetItem | null> {
  let item: LinkSetItem

  if (snapshot == null) {
    return null
  }
  if ((snapshot as Doc<LinkSetItem>).data) {
    item = (snapshot as Doc<LinkSetItem>).data
    item.id = (snapshot as Doc<LinkSetItem>).ref.id
  } else {
    item = (snapshot as LinkSetItem)
  }

  const authorUser = await get<User>(item.author).then((snapshot) => itemOrUndefined(snapshot))

  return {
    ...item,
    authorUser: authorUser,
  }
}

export async function hydrateLinkSet(linkSet: LinkSet,
  items: HydratedLinkSetItem[]): Promise<HydratedLinkSet | null> {
  if (linkSet == null) {
    return null
  }

  const latestPostUser = linkSet.latestPost ?
    await get<User>(linkSet.latestPost).then((snapshot) => itemOrUndefined(snapshot)) :
    undefined

  return {
    ...linkSet,
    latestPostUser: latestPostUser,
    items: items,
  }
}


