import fs from "fs"
import axios from "axios"
import {
  add, Collection, collection, Doc, get, limit, order, pathToRef, Query, query, Ref, ref, startAfter,
  subcollection, update, upset, where,
} from "typesaurus"
import {itemOrNull} from "../common/data"
import {getGffftRef, getGffftUser, gffftsCollection} from "../gfffts/gffft_data"
import {Gffft} from "../gfffts/gffft_models"
import {User} from "../users/user_models"
import {
  HydratedLinkSet, HydratedLinkSetItem, Link, LinkCache,
  LinkSet, LinkSetItem, LinkStat, UpdateLink,
} from "./link_set_models"
import {getMetadata, IPageMetadata} from "page-metadata-parser"
import domino from "domino"
import {uuid} from "uuidv4"

import urlParser from "url-parse"
import {parse as parseHtml, HTMLElement} from "node-html-parser"
import {getThreadByRef} from "../boards/board_data"
import * as opentelemetry from "@opentelemetry/api"

export const DEFAULT_LINK_SET_KEY = "default"

export const linksCollection = collection<Link>("links")
export const linkStatsCollection = subcollection<LinkStat, Link>("stats", linksCollection)
export const linkCacheCollection = subcollection<LinkCache, Link>("cache", linksCollection)

export const linkSetCollection = subcollection<LinkSet, Gffft, User>("link-sets", gffftsCollection)
export const linkSetItemsCollection = subcollection<LinkSetItem, LinkSet,
  Gffft, [string, string]>("items", linkSetCollection)

export async function getLinkSetByRef(itemRef: Ref<LinkSet>): Promise<LinkSet | null> {
  return get(itemRef).then(itemOrNull)
}

export async function getLinkSetByRefString(refId: string): Promise<LinkSet | null> {
  const itemRef = pathToRef<LinkSet>(refId)
  return getLinkSetByRef(itemRef)
}

export async function getOrCreateDefaultLinkSet(uid: string, gid: string): Promise<LinkSet> {
  const linkSets = getLinkSetCollection(uid, gid)

  let linkSet = await query(linkSets, [
    where("key", "==", DEFAULT_LINK_SET_KEY),
    limit(1),
  ]).then(itemOrNull)

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

  const itemRef = getLinkSetRef(uid, gid, lid)
  console.log(`itemRef: ${JSON.stringify(itemRef)}`)
  return getLinkSetByRef(itemRef)
}

export function getLinkSetCollection(uid: string, gid: string): Collection<LinkSet> {
  return linkSetCollection(getGffftRef(uid, gid))
}

export function getLinkSetRef(uid: string, gid: string, lid: string): Ref<LinkSet> {
  return ref(getLinkSetCollection(uid, gid), lid)
}

export async function getLinkSetItems(uid: string,
  gid: string,
  mid: string,
  offset?: string,
  maxResults = 200): Promise<HydratedLinkSetItem[]> {
  const linkSetRef = getLinkSetRef(uid, gid, mid)
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
      console.log(`snapshot ref: ${snapshot.data?.linkRef?.id}`)
      const link = snapshot.data?.linkRef ?
        await getLinkByRef(snapshot.data?.linkRef) :
        null

      if (link == null) {
        console.error(`null link reference: ${snapshot.ref.id}`)
      } else {
        const hydratedItem = await hydrateLinkSetItem(uid, gid, snapshot, link)
        if (hydratedItem != null) {
          items.push(hydratedItem)
        }
      }
    }
    return items
  })
}


export async function hydrateLinkSetItem(uid: string, gid: string, snapshot: Doc<LinkSetItem> |
  LinkSetItem |
  null, link: Link | null): Promise<HydratedLinkSetItem | null> {
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

  const thread = item.threadRef ?
    await getThreadByRef(item.threadRef) :
    null

  const authorUser = await getGffftUser(uid, gid, item.author)

  return {
    ...item,
    authorUser: authorUser ? authorUser : undefined,
    link: link == null ? undefined : link,
    thread: thread == null ? undefined : thread,
  }
}

export async function hydrateLinkSet(uid: string, gid: string, linkSet: LinkSet,
  items: HydratedLinkSetItem[]): Promise<HydratedLinkSet> {
  const latestPostUser = linkSet.latestPost ?
    await getGffftUser(uid, gid, linkSet.latestPost) :
    null

  return {
    ...linkSet,
    latestPostUser: latestPostUser ? latestPostUser : undefined,
    items: items,
  }
}

export async function getLink(url: string): Promise<Link | null> {
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

export async function downloadFile(fileUrl: string, outputLocationPath: string): Promise<boolean> {
  const writer = fs.createWriteStream(outputLocationPath)

  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    // ensure that the user can call `then()` only when the file has
    // been downloaded entirely.

    return new Promise((resolve, reject) => {
      response.data.pipe(writer)
      let error: Error | null = null
      writer.on("error", (err) => {
        error = err
        writer.close()
        reject(err)
      })
      writer.on("close", () => {
        if (!error) {
          resolve(true)
        }
        // no need to call the reject here, as it will have been called in the
        // 'error' stream;
      })
    })
  })
}

export async function getOrCreateLinkCache(linkRef: Ref<Link>, url: string): Promise<LinkCache | null> {
  let finalUrl = url

  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    finalUrl = `http://${finalUrl}`
  }
  const parsedUrl = urlParser(finalUrl)

  console.debug("link not found, fetching")
  const response = await axios
    .get(finalUrl)
    .catch((error) => {
      console.info(`error fetching url: ${finalUrl}. ${error}`)
      return null
    })

  if (response == null) {
    console.debug("response was null")
    return null
  }

  let title: string | undefined | null = null
  let description: string | undefined | null
  let image: string | undefined
  let metadata: IPageMetadata | undefined
  let images: string[] = []
  let body: string | undefined = undefined

  finalUrl = response.request.res.responseUrl
  const mimeType = response.headers["content-type"] != null ? response.headers["content-type"] : ""
  if (mimeType.startsWith("image/")) {
    image = finalUrl
    images = [image]
  } else if (mimeType.startsWith("text/html") ||
    mimeType.startsWith("text/xml") ||
    mimeType.startsWith("text/xhtml")) {
    const data = await response.data

    if (typeof data == "string") {
      body = data
      const doc = domino.createWindow(data).document
      metadata = getMetadata(doc, finalUrl)

      title ??= metadata.title
      description ??= metadata.description

      const $ = parseHtml(data)

      if (!title) {
        const htmlTitle = $.querySelector("title")
        if (htmlTitle) {
          title = htmlTitle.text
        }
      }

      const metas = $.querySelectorAll("meta")

      for (const el of metas) {
        if (!description) {
          const val = readMT(el, "description")
          if (val) {
            description = val
          }
        }

        if (!title) {
          const val = readMT(el, "title")
          if (val) {
            title = val
          }
        }

        if (!image) {
          const val = readMT(el, "image")
          if (val) {
            image = val
          }
        }
      }

      const imgs = $.getElementsByTagName("img")
      if (imgs.length > 0) {
        for (const img of imgs) {
          const imgSrc = img?.getAttribute("src")

          if (imgSrc != null && imgSrc != "") {
            const imgUrl = new URL(imgSrc, parsedUrl.origin)
            if (!image) {
              image = imgUrl.href
            }
            images.push(imgUrl.href)
          }
        }
      }

      if (images.length > 0) {
        image = images[0]
      }
    }

    // might as well look into downloading + writing other things (images, css, js, etc...)
    // const itemId = uuid()
  } else {
    console.warn(`unhandled mime type: ${mimeType}`)
  }

  const linkCache = {
    url: url,
    domain: parsedUrl.hostname,
    body: body ?? undefined,
    createdAt: new Date(),
    title: title,
    description: description,
    image: image,
    images: images,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    responseCode: response.status,
  } as LinkCache

  const newRef = await add(linkCacheCollection(linkRef), linkCache)
  linkCache.id = newRef.id
  return linkCache
}

export async function getOrCreateLink(url: string): Promise<Link | null> {
  let finalUrl = url

  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    finalUrl = `http://${finalUrl}`
  }
  const parsedUrl = urlParser(finalUrl)

  const activeSpan = opentelemetry.trace.getSpan(opentelemetry.context.active())
  activeSpan?.setAttribute("link.url", url)
  activeSpan?.setAttribute("link.domain", parsedUrl.hostname)

  activeSpan?.addEvent("checking link")

  let linkCache: LinkCache | null = null
  let link = await getLink(finalUrl)
  if (link == null) {
    const itemId = uuid()
    const linkRef = ref(linksCollection, itemId)
    linkCache = await getOrCreateLinkCache(linkRef, url)
    if (linkCache == null) {
      return null
    }

    link = {
      domain: parsedUrl.hostname,
      url: finalUrl,
      responseCode: linkCache?.responseCode,
      title: linkCache?.title,
      description: linkCache?.description,
      image: linkCache?.image,
      images: linkCache?.images,
      createdAt: new Date(),
      updatedAt: new Date(),
      queryCount: 1,
      clickCount: 0,
      saveCount: 0,
    } as Link

    await upset(linkRef, link)
    link.id = linkRef.id
  } else {
    // 2 hour cache
    if (new Date().getTime() - link.updatedAt.getTime() > (1000 * 60 * 60 * 2)) {
      const linkRef = ref(linksCollection, link.id)
      linkCache = await getOrCreateLinkCache(linkRef, url)

      if (linkCache != null) {
        link.domain = linkCache.domain
        link.image = linkCache.image
        link.images = linkCache.images
        link.url = linkCache.url
        link.responseCode = linkCache.responseCode
        link.updatedAt = new Date()

        await update<UpdateLink>(linksCollection, link.id, {
          ...link,
        })
      }
    }
  }

  return link
}

export async function getLinkByRef(itemRef: Ref<Link>): Promise<Link | null> {
  return get(itemRef).then(itemOrNull)
}

export async function getLinkByRefString(refId: string): Promise<Link | null> {
  const itemRef = pathToRef<Link>(refId)
  return getLinkByRef(itemRef)
}

const readMT = (el: HTMLElement, name: string) => {
  const prop = el.getAttribute("name") || el.getAttribute("property")
  return prop == name ? el.getAttribute("content") : null
}

