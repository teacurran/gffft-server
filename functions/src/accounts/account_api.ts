import express, {Response} from "express"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import {LoggedInUser, requiredAuthentication} from "../auth"
import router from "../gfffts/gffft_api"
import * as Joi from "@hapi/joi"
import {Account} from "./account_models"
import {accountToWebfinger} from "./account_interfaces"

// eslint-disable-next-line new-cap
const accountRouter = express.Router()
const validator = createValidator()

const accountCreateRequestParams = Joi.object({
  handle: Joi.string().required(),
  name: Joi.string().required(),
  note: Joi.string().optional().allow(null, ""),
})

export interface AccountCreateRequest extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    handle: string;
    name: string;
    note?: string,
  };
}

router.post(
  "/",
  requiredAuthentication,
  validator.body(accountCreateRequestParams),
  async (
    req: ValidatedRequest<AccountCreateRequest>,
    res: Response,
  ) => {
    const iamUser: LoggedInUser = res.locals.iamUser
    const item = req.body

    // todo use SQL to ensure username is unique

    const account: Account = {
      handle: item.handle,
      name: item.name,
      note: item.note,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // todo: create account here

    res.json(accountToWebfinger(account))
  }
)


export {accountRouter}
