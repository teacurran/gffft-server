import express, {Response} from "express"
import {ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import * as Joi from "joi"
import {getAccountByHandle} from "../accounts/account_data"
import {accountToWebfinger} from "../accounts/account_interfaces"

// eslint-disable-next-line new-cap
const webfingerRouter = express.Router()
const validator = createValidator()

export const getWebfingerPrams = Joi.object({
  resource: Joi.string().required(),
})

export interface GetWebfingerRequest extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    resource: string
  }
}

webfingerRouter.get(
  "/",
  validator.params(getWebfingerPrams),
  async (req: ValidatedRequest<GetWebfingerRequest>, res: Response) => {
    const resource = req.params.resource
    if (!resource.startsWith("acct:")) {
      res.sendStatus(404)
      return
    }

    let handle: string | null = null
    const matches = resource.match(/^acct:(\.+)@.*/)
    if (matches) {
      handle = matches[1]
    }
    if (handle == null) {
      res.sendStatus(404)
      return
    }

    const account = await getAccountByHandle(handle)

    res.json(accountToWebfinger(account))
  }
)

export {webfingerRouter}
