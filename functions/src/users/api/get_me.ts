import {Request, Response} from "express"
import {LoggedInUser} from "../../accounts/auth"
import {User} from "../user_models"
import {getHydratedUserBookmarks, getUser} from "../user_data"
import {bookmarksToJson, iamUserToJson} from "../user_interfaces"

export const getMe = async (req: Request, res: Response) => {
  const iamUser: LoggedInUser = res.locals.iamUser
  const userId = iamUser.id
  const user: User = await getUser(userId)

  res.json(iamUserToJson(user))
}

export const getMeBookmarks = async (req: Request, res: Response) => {
  const iamUser: LoggedInUser = res.locals.iamUser
  const userId = iamUser.id
  const bookmarks = await getHydratedUserBookmarks(userId)

  res.json(bookmarksToJson(bookmarks))
}
