import * as firebaseAdmin from "firebase-admin"
import {Request, Response, NextFunction} from "express"
import {getNpc} from "./npcs/data"

export type LoggedInUser = {
  id: string
}

export const requiredAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    res.status(403).send("Unauthorized")
    return
  }
  const idToken = req.headers.authorization.split("Bearer ")[1]
  if (!res.locals) {
    res.locals = {}
  }

  try {
    const iamUser = await authenticateAndFetchUser(idToken)
    res.locals.iamUser = iamUser
  } catch (error) {
    console.log(error)
    res.status(403).send("Unauthorized: Token expired")
    return
  }


  next()
}

export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!res.locals) {
    res.locals = {}
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    const idToken = req.headers.authorization.split("Bearer ")[1]

    const iamUser = await authenticateAndFetchUser(idToken)

    res.locals.iamUser = iamUser

    next()
  } else {
    next()
  }
}

/**
 * gets user from firebase
 * @param {string} idToken Token to look up.
 * @return {Promise<LoggedInUser|null>}.
 */
async function authenticateAndFetchUser(idToken: string): Promise<LoggedInUser|null> {
  console.log(`authenticating user: ${idToken}`)
  let userId: string
  if (idToken.startsWith("npc-")) {
    console.log("token appears to be npc")
    const splitToken = idToken.split("-")
    if (splitToken.length == 3) {
      const npc = await getNpc(splitToken[1])
      if (npc != null) {
        return {
          id: splitToken[2],
        }
      }
      return null
    } else {
      return null
    }
  } else if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const base64String = idToken.split(".")[1]
    const jsonString = Buffer.from(base64String, "base64").toString("ascii")
    userId = JSON.parse(jsonString).user_id
  } else {
    const auth = firebaseAdmin.auth()
    const decodedToken = await auth.verifyIdToken(idToken)
    userId = decodedToken.uid
  }

  return firebaseAdmin.auth().getUser(userId).then((userRecord) => {
    return {
      id: userRecord.uid,
    }
  })
}
