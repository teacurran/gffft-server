import {IBoardType} from "../boards/board_types"
import {ICalendarType} from "../calendars/calendar_types"
import {notEmpty} from "../common/utils"
import {IGalleryType} from "../galleries/gallery_types"
import {INotebookType} from "../notebooks/notebook_types"
import {Gffft} from "./gffft_models"

export interface IGffftId {
  uid: string
  gid: string
}

export interface IGffftFeatureRef {
  type: string
  id: string
}

export interface IGffftType {
    uid: string
    gid: string
    name: string
    description: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    features?: IGffftFeatureRef[]
    boards: IBoardType[]
    calendars: ICalendarType[]
    galleries: IGalleryType[]
    notebooks: INotebookType[]
    createdAt?: Date
    updatedAt?: Date
  }

export interface IGffftPutType {
    name: string
    description: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    boardEnabled: boolean
    calendarEnabled: boolean
    galleryEnabled: boolean
    notebookEnabled: boolean
  }

export interface IGffftMinimalType {
    uid?: string
    gid?: string
    name: string
    description: string
    allowMembers: boolean
    requireApproval: boolean
    pagesEnabled: boolean
    boardEnabled: boolean
    galleryEnabled: boolean
  }

export interface IGffftFruitCode {
  fruitCode: string[]
}

/**
   * to Json
   * @param {string} fruitCode fc serialize
   * @return {IGffftFruitCode}
   */
export function fruitCodeToJson(
  fruitCode: string,
): IGffftFruitCode {
  return {
    fruitCode: [...fruitCode],
  }
}

/**
 * @swagger
 * definitions:
 *   IUserTypeMinimal:
 *     type: object
 *     properties:
 *       total:
 *         type: number
 *       offset:
 *         type: number
 *       count:
 *         type: number
 *       items:
 *         type: array
 *         required: false
 *         items:
 *           $ref: '#/definitions/IGffftType'
 */
export interface IGffftResultsType {
  count: number
  items: IGffftMinimalType[]
}

/**
   * converts a list of gfffts to json
   * @param {Gffft[]} items to serialize
   * @return {IIAMUserType}
   */
export function gffftsToJson(
  items: Gffft[]
): IGffftResultsType {
  const itemsJson = items.map((item) => gffftToJsonMinimal(item)).filter(notEmpty)
  return {
    count: items.length,
    items: itemsJson,
  }
}

export function gffftToJson(
  gffft: Gffft,
  features: IGffftFeatureRef[],
  boards: IBoardType[],
  calendars: ICalendarType[],
  galleries: IGalleryType[],
  notebooks: INotebookType[],
): IGffftType | null {
  if (gffft == null || gffft.uid == null) {
    return null
  }
  const item: IGffftType = {
    uid: gffft.uid,
    gid: gffft.id,
    name: gffft.name,
    description: gffft.description,
    intro: gffft.intro,
    tags: gffft.tags,
    enabled: gffft.enabled,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    enableAltHandles: gffft.enableAltHandles,
    features: features,
    boards: boards,
    calendars: calendars,
    galleries: galleries,
    notebooks: notebooks,
    createdAt: gffft.createdAt,
    updatedAt: gffft.updatedAt,
  }
  return item
}

/**
   * to Json
   * @param {Gffft} gffft to serialize
   * @return {IIAMUserType}
   */
export function gffftToJsonMinimal(
  gffft: Gffft,
): IGffftMinimalType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftMinimalType = {
    uid: gffft.uid,
    gid: gffft.id,
    name: gffft.name,
    description: gffft.description,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    pagesEnabled: gffft.pagesEnabled,
    boardEnabled: gffft.boardEnabled,
    galleryEnabled: gffft.galleryEnabled,
  }
  return item
}
