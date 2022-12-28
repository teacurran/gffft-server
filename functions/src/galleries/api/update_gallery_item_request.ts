import * as Joi from "joi"
import {ContainerTypes, ValidatedRequestSchema} from "express-joi-validation"

export const updateGalleryItemParams = Joi.object({
  description: Joi.string().optional().allow(null, ""),
})
export interface UpdateGalleryItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
  [ContainerTypes.Body]: {
    description?: string
  }
}
