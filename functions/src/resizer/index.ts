/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as admin from "firebase-admin"
import * as fs from "fs"
import * as functions from "firebase-functions"
import mkdirp from "mkdirp"
import * as os from "os"
import * as path from "path"
import {logger} from "firebase-functions"

import {
  ResizedImageResult,
  modifyImage,
  supportedContentTypes,
} from "./resize-image"
import {getConfig, deleteImage} from "./config"
import * as logs from "./logs"
import {extractFileNameWithoutExtension, startsWithArray} from "./util"
import sharp from "sharp"
import {galleryCollection, galleryItemsCollection} from "../galleries/gallery_data"
import {ref, upset} from "typesaurus"
import {GalleryItemThumbnail} from "../galleries/gallery_models"
import {gffftsCollection} from "../gfffts/gffft_data"
import {usersCollection} from "../users/user_data"

sharp.cache(false)

logs.init()
const config = getConfig()

/**
 * When an image is uploaded in the Storage bucket, we generate a resized image automatically using
 * the Sharp image converting library.
 */
export const generateResizedImage = functions.storage.object().onFinalize(
  async (object): Promise<void> => {
    logs.start()
    const {contentType} = object // This is the image MIME type

    const objectName = object.name ?? ""

    const tmpFilePath = path.resolve("/", path.dirname(objectName)) // Absolute path to dirname

    if (!contentType) {
      logs.noContentType()
      return
    }

    if (!contentType.startsWith("image/")) {
      logs.contentTypeInvalid(contentType)
      return
    }

    if (object.contentEncoding === "gzip") {
      logs.gzipContentEncoding()
      return
    }

    if (!supportedContentTypes.includes(contentType)) {
      logs.unsupportedType(supportedContentTypes, contentType)
      return
    }

    if (
      config.includePathList &&
      !startsWithArray(config.includePathList, tmpFilePath)
    ) {
      logs.imageOutsideOfPaths(config.includePathList, tmpFilePath)
      return
    }

    if (
      config.excludePathList &&
      startsWithArray(config.excludePathList, tmpFilePath)
    ) {
      logs.imageInsideOfExcludedPaths(config.excludePathList, tmpFilePath)
      return
    }

    if (object.metadata && object.metadata.resizedImage === "true") {
      logs.imageAlreadyResized()
      return
    }

    const bucket = admin.storage().bucket(object.bucket)
    const filePath = objectName // File path in the bucket.
    const fileDir = path.dirname(filePath)
    const fileExtension = path.extname(filePath)
    const fileNameWithoutExtension = extractFileNameWithoutExtension(
      filePath,
      fileExtension
    )
    const objectMetadata = object

    let originalFile: string | undefined = undefined
    let remoteFile
    try {
      originalFile = path.join(os.tmpdir(), filePath)
      const tempLocalDir = path.dirname(originalFile)

      // Create the temp directory where the storage file will be downloaded.
      logs.tempDirectoryCreating(tempLocalDir)
      await mkdirp(tempLocalDir)
      logs.tempDirectoryCreated(tempLocalDir)

      // Download file from bucket.
      remoteFile = bucket.file(filePath)
      logs.imageDownloading(filePath)
      if (process.env.FUNCTIONS_EMULATOR) {
        // emulator does not support createReadStream()
        // turning off validation should make the file downlaod work
        await remoteFile.download({destination: originalFile, validation: false})
      } else {
        await remoteFile.download({destination: originalFile})
      }

      logs.imageDownloaded(filePath, originalFile)

      // Get a unique list of image types
      const imageTypes = new Set(config.imageTypes)

      // Convert to a set to remove any duplicate sizes
      const imageSizes = new Set(config.imageSizes)

      const tasks: Promise<ResizedImageResult>[] = []

      imageTypes.forEach((format) => {
        imageSizes.forEach((size) => {
          if (originalFile == undefined) {
            logger.info(`original file is undefined, skipping. format:${format} size:${size}`)
          } else {
            logger.info(`original found, generating format:${format} size:${size}`)
            tasks.push(
              modifyImage({
                bucket,
                originalFile,
                fileDir,
                fileNameWithoutExtension,
                fileExtension,
                contentType,
                size,
                objectMetadata: objectMetadata,
                format,
              })
            )
          }
        })
      })

      const results = await Promise.all(tasks)

      const failed = results.some((result) => result.success === false)
      if (failed) {
        logs.failed()
        return
      } else {
        if (config.deleteOriginalFile === deleteImage.onSuccess) {
          if (remoteFile) {
            try {
              logs.remoteFileDeleting(filePath)
              await remoteFile.delete()
              logs.remoteFileDeleted(filePath)
            } catch (err) {
              if (err instanceof Error) {
                logs.errorDeleting(err)
              }
            }
          }
        }

        const urls: Array<string> = []
        for (let index = 0; index < results.length; index++) {
          const item = results[index]
          if (item.url) {
            urls.push(item.url)
          }
        }

        const metadata = objectMetadata.metadata ?? {}
        const uid = metadata.uid
        const gid = metadata.gid
        const mid = metadata.mid
        const iid = metadata.iid
        if (uid && gid && mid && iid) {
          logger.info(`marking complete: uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)

          const gfffts = gffftsCollection(ref(usersCollection, uid))
          const galleries = galleryCollection(ref(gfffts, gid))
          const itemsCollection = galleryItemsCollection(ref(galleries, mid))
          const itemRef = ref(itemsCollection, iid)
          const item = {
            thumbnail: true,
            urls: urls,
          } as GalleryItemThumbnail
          await upset<GalleryItemThumbnail>(itemRef, item)
        } else {
          logger.warn(`something missing: uid:${uid} gid:${gid} mid:${mid} iid:${iid}`)
        }

        logs.complete()
      }
    } catch (err) {
      if (err instanceof Error) {
        logs.error(err)
      }
    } finally {
      if (originalFile != undefined) {
        logs.tempOriginalFileDeleting(filePath)
        fs.unlinkSync(originalFile)
        logs.tempOriginalFileDeleted(filePath)
      }
      if (config.deleteOriginalFile === deleteImage.always) {
        // Delete the original file
        if (remoteFile) {
          try {
            logs.remoteFileDeleting(filePath)
            await remoteFile.delete()
            logs.remoteFileDeleted(filePath)
          } catch (err) {
            if (err instanceof Error) {
              logs.errorDeleting(err)
            }
          }
        }
      }
    }
  }
)
