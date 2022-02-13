import axios from "axios"
import {add, collection, Doc, get, limit, order, pathToRef, Query, query, Ref, ref, startAfter,
  subcollection, update, where} from "typesaurus"
import {itemOrNull, itemOrUndefined} from "../common/data"
import {gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {usersCollection} from "../users/user_data"
import {User} from "../users/user_models"
import {HydratedLinkSet, HydratedLinkSetItem, Link, LinkCache,
  LinkSet, LinkSetItem, LinkStat, UpdateLink} from "./link_set_models"
import {unfurl} from "unfurl.js"
import {parse} from "node-html-parser"
import urlParser from "url-parse"
import {hny} from "../common/utils"

const DEFAULT_LINK_SET_KEY = "default"

export const linksCollection = collection<Link>("links")
export const linkStatsCollection = subcollection<LinkStat, Link>("stats", linksCollection)
export const linkCacheCollection = subcollection<LinkCache, Link>("cache", linksCollection)

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

export async function getLink(url: string): Promise<Link | null> {
  // todo
  // transform URL to make domain case insensitive
  return query(linksCollection, [
    where("url", "==", url),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      return itemOrNull(results[0])
    }
    return null
  })
}

export async function getOrCreateLink(url: string): Promise<Link | null> {
  const parsedUrl = urlParser(url)

  const event = hny.newEvent()
  event.addField("name", "link")
  event.addField("action", "get")
  event.addField("domain", parsedUrl.hostname)
  event.addField("url", url)
  event.send()

  let link = await getLink(url)
  if (link == null) {
    const response = await axios
      .get(url)
      .catch((error) => {
        console.info(`error fetching url: ${url}. ${error}`)
        return null
      })

    if (response == null) {
      return null
    }

    const unfurled = await unfurl(url)

    let title = unfurled.title
    let description = unfurled?.description ?? unfurled.open_graph?.description
    let image: string | undefined = undefined
    let body: string | undefined = undefined

    if (response.headers["content-type"] != null && response.headers["content-type"].startsWith("image/")) {
      image = url
      title = url
      description = ""
    } else {
      if (typeof response.data == "string") {
        body = response.data
        const dom = parse(body)

        const imgs = dom.getElementsByTagName("img")
        if (imgs.length > 0) {
          const img = imgs[0]
          image = img.getAttribute("src")
          if (image != null && image != "") {
            const imgUrl = new URL(image, parsedUrl.origin)
            image = imgUrl.href
          }
        }
      }
    }

    link = {
      domain: parsedUrl.hostname,
      url: url,
      title: title,
      description: description,
      image: image,
      metadata: JSON.stringify(unfurled),
      responseCode: response.status,
      body: body,
      createdAt: new Date(),
      updatedAt: new Date(),
      queryCount: 1,
      clickCount: 0,
      saveCount: 0,
    } as Link

    const ref = await add(linksCollection, link)
    link.id = ref.id
  } else {
    if (new Date().getTime() - link.updatedAt.getTime() > (1000 * 60 * 60 * 24)) {
      const response = await axios.get(url)
      const unfurled = await unfurl(url)

      let title = unfurled.title
      let description = unfurled?.description ?? unfurled.open_graph?.description
      let image: string | undefined = undefined
      let body: string | undefined = undefined

      if (response.headers["content-type"] != null && response.headers["content-type"].startsWith("image/")) {
        image = url
        title = url
        description = ""
      } else {
        if (typeof response.data == "string") {
          body = response.data
          const dom = parse(body)

          const imgs = dom.getElementsByTagName("img")
          if (imgs.length > 0) {
            const img = imgs[0]
            image = img.getAttribute("src")
            if (image != null && image != "") {
              image = `${parsedUrl.protocol}${parsedUrl.host}${parsedUrl.pathname}/${image}`
            }
          }
        }
      }

      link.domain = parsedUrl.hostname
      link.title = title
      link.image = image
      link.description = description
      link.metadata = JSON.stringify(unfurled)
      link.responseCode = response.status
      link.body = body
      link.updatedAt= new Date(),

      await update<UpdateLink>(linksCollection, link.id, {
        ...link,
      })
    }
  }

  return link
}


