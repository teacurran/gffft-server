import express from "express"
import {createValidator} from "express-joi-validation"
import {requiredAuthentication} from "../accounts/auth"

import {apiCreateLink, createLinkSetParams} from "./api/create_link"
import {getLinkRequest, linkGetQueryParams} from "./api/get_link"

// eslint-disable-next-line new-cap
const router = express.Router()
const validator = createValidator()

router.post(
  "/",
  validator.fields(createLinkSetParams),
  requiredAuthentication,
  apiCreateLink
)

router.get(
  "/link",
  validator.query(linkGetQueryParams),
  getLinkRequest
)

export default router
