import * as Joi from "joi"
import {ContainerTypes, ValidatedRequestSchema} from "express-joi-validation"

export const deleteBookmarkParams = Joi.object({
  gid: Joi.string().required(),
})
export interface DeleteBookmarkRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    gid: string
  }
}
