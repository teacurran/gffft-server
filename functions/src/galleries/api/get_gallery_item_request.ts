import * as Joi from "joi"
import {ContainerTypes, ValidatedRequestSchema} from "express-joi-validation"

export const getGalleryItemPathParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  mid: Joi.string().required(),
  iid: Joi.string().required(),
})
export interface GetGalleryItemRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    uid: string
    gid: string
    mid: string
    iid: string
  }
  [ContainerTypes.Query]: {
    max?: number
    offset?: string
  };
}
