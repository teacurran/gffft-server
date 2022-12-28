import * as Joi from "joi"
import {ContainerTypes, ValidatedRequestSchema} from "express-joi-validation"

export const createGffftMembershipParams = Joi.object({
  uid: Joi.string().required(),
  gid: Joi.string().required(),
  handle: Joi.string(),
})
export interface CreateGffftMembershipRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    uid: string
    gid: string
    handle: string
  }
}
