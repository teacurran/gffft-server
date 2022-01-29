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

import * as functions from "firebase-functions"

export enum deleteImage {
  always = 0,
  never,
  onSuccess,
}

// function deleteOriginalFile(deleteType: string | undefined) {
//   switch (deleteType) {
//   case "true":
//     return deleteImage.always
//   case "false":
//     return deleteImage.never
//   case "onsuccess":
//     return deleteImage.onSuccess
//   default:
//     return deleteImage.never
//   }
// }

function paramToArray(param: string | undefined): string[] | undefined {
  return typeof param === "string" ? param.split(",") : undefined
}

function getImageSizes(param: string | undefined): string[] {
  if (param) {
    return param.split(",")
  }
  return ["200x200"]
}

export interface IConfig {
  bucket: string
  cacheControlHeader: string
  imageSizes: string[]
  resizedImagesPath: string
  includePathList: string[] | undefined
  excludePathList: string[] | undefined
  deleteOriginalFile: deleteImage
  imageTypes: string[] | undefined
}

export function getConfig(): IConfig {
  const config = functions.config().env.resize

  return {
    bucket: config.bucket,
    cacheControlHeader: config.cache,
    imageSizes: getImageSizes(config.sizes),
    resizedImagesPath: config.resizedImagePath,
    includePathList: paramToArray(config.includePathList),
    excludePathList: undefined,
    deleteOriginalFile: deleteImage.never,
    imageTypes: paramToArray(config.imageType),
  }
}

