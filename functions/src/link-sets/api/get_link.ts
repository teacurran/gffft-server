import {ContainerTypes, ValidatedRequest, ValidatedRequestSchema} from "express-joi-validation"
import Joi from "joi"
import {update, value} from "typesaurus"
import {getOrCreateLink, linksCollection} from "../link_set_data"
import {linkToJson} from "../link_set_interfaces"
import {UpdateLink} from "../link_set_models"
import {Response} from "express"

export interface LinkRequest extends ValidatedRequestSchema {
    [ContainerTypes.Query]: {
      url: string
    };
  }
export const linkGetQueryParams = Joi.object({
  url: Joi.string().required(),
})

export const getLinkRequest = async (req: ValidatedRequest<LinkRequest>, res: Response) => {
  const url = decodeURIComponent(req.query.url)

  const link = await getOrCreateLink(url)
  if (link == null) {
    res.status(500).send("unable to fetch url")
    return
  }
  await update<UpdateLink>(linksCollection, link.id, {
    queryCount: value("increment", 1),
  })

  res.json(linkToJson(link))
}
