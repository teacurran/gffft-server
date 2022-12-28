import * as Joi from "joi"
import {ContainerTypes, ValidatedRequestSchema} from "express-joi-validation"

export const getGalleryPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
})
export const getGalleryQueryParams = Joi.object({
  max: Joi.string().optional(),
  offset: Joi.string().optional(),
})
export interface GetGalleryRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
