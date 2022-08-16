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

import {logger} from "firebase-functions"
import {getConfig} from "./config"
const config = getConfig()

export const complete = ():void => {
  logger.log("Completed execution of extension")
}

export const noContentType = ():void => {
  logger.log("File has no Content-Type, no processing is required")
}

export const gzipContentEncoding = ():void => {
  logger.log("Images encoded with 'gzip' are not supported by this extension")
}

export const contentTypeInvalid = (contentType: string):void => {
  logger.log(
    `File of type '${contentType}' is not an image, no processing is required`
  )
}

export const unsupportedType = (
  unsupportedTypes: string[],
  contentType: string
):void => {
  logger.log(
    `Image type '${contentType}' is not supported, here are the supported file types: ${unsupportedTypes.join(
      ", "
    )}`
  )
}

export const error = (err: Error):void => {
  logger.error("Error when resizing image", err)
}

export const errorDeleting = (err: Error):void => {
  logger.warn("Error when deleting temporary files", err)
}

export const failed = ():void => {
  logger.error("Failed execution of extension")
}

export const imageAlreadyResized = ():void => {
  logger.log("File is already a resized image, no processing is required")
}

export const imageOutsideOfPaths = (
  absolutePaths: string[],
  imagePath: string
):void => {
  logger.log(
    `Image path '${imagePath}' is not supported, these are the supported absolute paths: ${absolutePaths.join(
      ", "
    )}`
  )
}

export const imageInsideOfExcludedPaths = (
  absolutePaths: string[],
  imagePath: string
):void => {
  logger.log(
    `Image path '${imagePath}' is not supported, these are the not supported absolute paths: ${absolutePaths.join(
      ", "
    )}`
  )
}

export const imageDownloaded = (remotePath: string, localPath: string):void => {
  logger.log(`Downloaded image file: '${remotePath}' to '${localPath}'`)
}

export const imageDownloading = (path: string):void => {
  logger.log(`Downloading image file: '${path}'`)
}

export const imageConverting = (
  originalImageType: string,
  imageType: string
):void => {
  logger.log(
    `Converting image from type, ${originalImageType}, to type ${imageType}.`
  )
}

export const imageConverted = (imageType: string):void => {
  logger.log(`Converted image to ${imageType}`)
}

export const imageResized = (path: string):void => {
  logger.log(`Resized image created at '${path}'`)
}

export const imageResizing = (path: string, size: string):void => {
  logger.log(`Resizing image at path '${path}' to size: ${size}`)
}

export const imageUploaded = (path: string):void => {
  logger.log(`Uploaded resized image to '${path}'`)
}

export const imageUploading = (path: string):void => {
  logger.log(`Uploading resized image to '${path}'`)
}

export const init = ():void => {
  logger.log("Initializing extension with configuration", config)
}

export const start = ():void => {
  logger.log("Started execution of extension with configuration", config)
}

export const tempDirectoryCreated = (directory: string):void => {
  logger.log(`Created temporary directory: '${directory}'`)
}

export const tempDirectoryCreating = (directory: string):void => {
  logger.log(`Creating temporary directory: '${directory}'`)
}

export const tempOriginalFileDeleted = (path: string):void => {
  logger.log(`Deleted temporary original file: '${path}'`)
}

export const tempOriginalFileDeleting = (path: string):void => {
  logger.log(`Deleting temporary original file: '${path}'`)
}

export const tempResizedFileDeleted = (path: string):void => {
  logger.log(`Deleted temporary resized file: '${path}'`)
}

export const tempResizedFileDeleting = (path: string):void => {
  logger.log(`Deleting temporary resized file: '${path}'`)
}

export const remoteFileDeleted = (path: string):void => {
  logger.log(`Deleted original file from storage bucket: '${path}'`)
}

export const remoteFileDeleting = (path: string):void => {
  logger.log(`Deleting original file from storage bucket: '${path}'`)
}
