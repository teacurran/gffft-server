// import {User} from "../db/models"
import firebaseAdmin = require("firebase-admin");
import UserRecord = firebaseAdmin.auth.UserRecord;
import {Request, Response, NextFunction} from "express"

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

  const iamUser = await authenticateAndFetchUser(idToken)
  res.locals.iamUser = iamUser
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
 * Adds two numbers together.
 * @param {string} idToken Token to look up.
 * @return {Promise<UserRecord>}.
 */
async function authenticateAndFetchUser(idToken: string): Promise<UserRecord> {
  const auth = firebaseAdmin.auth()
  let userId: string
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const base64String = idToken.split(".")[1]
    const jsonString = Buffer.from(base64String, "base64").toString("ascii")
    userId = JSON.parse(jsonString).user_id
  } else {
    const decodedToken = await auth.verifyIdToken(idToken)
    userId = decodedToken.uid
  }
  return firebaseAdmin.auth().getUser(userId)
}
