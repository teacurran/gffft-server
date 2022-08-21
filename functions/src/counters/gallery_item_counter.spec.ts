import "mocha"
import firebaseFunctionsTest from "firebase-functions-test"

import {expect} from "chai"
import {MockFirebaseInit} from "../test/auth"
import {getUser} from "../users/user_data"
import {galleryItemCounter} from "./gallery_item_counter"
import {EventContextOptions} from "firebase-functions-test/lib/main"
import {Change} from "firebase-functions"
import {DocumentSnapshot} from "@google-cloud/firestore"
import {getOrCreateDefaultGallery} from "../galleries/gallery_data"
import {Gallery, GalleryUpdateCounter} from "../galleries/gallery_models"
import {upset, pathToRef} from "typesaurus"

describe("gallery_item_counter", function() {
  const uid1 = "uid-1"
  const gid = "gffft-1"
  const iid = "item-1"
  let gallery: Gallery
  let galleryPath: string

  before(async function() {
    await MockFirebaseInit.getInstance().init()

    await getUser(uid1)

    gallery = await getOrCreateDefaultGallery(uid1, gid)
    galleryPath = `users/${uid1}/gfffts/${gid}/galleries/${gallery.id}`

    await upset<GalleryUpdateCounter>(pathToRef<Gallery>(galleryPath), {
      photoCount: 0,
      updatedAt: undefined,
    })
  })

  describe("increments photo counter", function() {
    const firebaseTest = firebaseFunctionsTest()

    const wrappedGalleryItemCounter = firebaseTest.wrap(galleryItemCounter)

    const galleryRefString = "users/{uid}/gfffts/{gid}/galleries/{mid}"
    const galleryItemShapshot = firebaseTest.firestore.makeDocumentSnapshot({
      id: "test-gallery-item-1",
      fileName: "test-file-name",
      filePath: "test-file-path",
      thumbnail: false,
      createdAt: new Date(),
      urls: [
        "https://example.com", "https://example.com",
      ],
      likes: ["test-uid-1"],
      likeCount: 0,
    }, `${galleryRefString}/items/{iid}`)

    const nonExistantSnapshot = {
      exists: false,
      data() {
        return undefined
      },
      ref: galleryItemShapshot.ref,
    } as DocumentSnapshot

    it("handles insert", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          mid: gallery.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(0)

      const changeEvent = firebaseTest.makeChange(
        nonExistantSnapshot,
        galleryItemShapshot,
      )

      await wrappedGalleryItemCounter(changeEvent, eventParams)

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(1)

      await wrappedGalleryItemCounter(changeEvent, eventParams)

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(2)
    })

    it("handles update", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          mid: gallery.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(2)

      const changeEvent = {
        before: galleryItemShapshot,
        after: galleryItemShapshot,
      } as Change<DocumentSnapshot>
      await wrappedGalleryItemCounter(changeEvent, eventParams)

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(2)
    })

    it("handles delete", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          mid: gallery.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(2)

      const changeEvent = {
        before: galleryItemShapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedGalleryItemCounter(changeEvent, eventParams)

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(1)
    })

    it("neither before nor after exists", async function() {
      const eventParams = {
        params: {
          uid: uid1,
          gid: gid,
          mid: gallery.id,
          iid: iid,
        },
      } as EventContextOptions

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(1)

      const changeEvent = {
        before: nonExistantSnapshot,
        after: nonExistantSnapshot,
      } as Change<DocumentSnapshot>
      await wrappedGalleryItemCounter(changeEvent, eventParams)

      expect((await getOrCreateDefaultGallery(uid1, gid)).photoCount).to.equal(1)
    })
  })
})

