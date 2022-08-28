import * as firebaseAdmin from "firebase-admin"
import {Request, Response, NextFunction} from "express"
import {getNpc} from "./npcs/data"
import {trace, context} from "@opentelemetry/api"
import cacheContainer from "../common/redis"
import {getGffft, getGffftMembership} from "../gfffts/gffft_data"
import {TYPE_PENDING, TYPE_REJECTED} from "../gfffts/gffft_models"

export type LoggedInUser = {
  id: string
}

async function checkForNpc(idToken: string): Promise<string|null> {
  if (idToken.startsWith("npc-")) {
    console.log("token appears to be npc")
    const splitToken = idToken.split("-")
    if (splitToken.length == 3) {
      const npc = await getNpc(splitToken[1])
      if (npc != null) {
        const userId = splitToken[2]
        observeUserId(userId)
        return userId
      }
    }
  }
  return null
}

async function authenticateAndFetchUser(idToken: string): Promise<LoggedInUser|null> {
  if (process.env.LOG_AUTH === "true") {
    console.log(`authenticating user: ${idToken}`)
  }
  const npcUserId = await checkForNpc(idToken)
  if (npcUserId) {
    return {id: npcUserId}
  }

  let userId: string
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const base64String = idToken.split(".")[1]
    const jsonString = Buffer.from(base64String, "base64").toString("ascii")
    userId = JSON.parse(jsonString).user_id
  } else {
    const auth = firebaseAdmin.auth()
    const decodedToken = await auth.verifyIdToken(idToken)
    userId = decodedToken.uid
  }

  let uid: string | undefined
  if (cacheContainer) {
    uid = await cacheContainer.getItem<string>(idToken)
  }
  if (uid) {
    console.debug(`got cache hit: ${uid}`)
  } else {
    try {
      const userRecord = await firebaseAdmin.auth().getUser(userId)
      uid = userRecord.uid
      if (cacheContainer) {
        await cacheContainer.setItem(idToken, uid, {ttl: 60})
      }
    } catch (e) {
      console.debug(`error getting user record: ${e}`)
      return null
    }
  }

  observeUserId(uid)

  return {
    id: uid,
  }
}

function observeUserId(userId: string) {
  const activeSpan = trace.getSpan(context.active())
  if (activeSpan != null) {
    activeSpan.setAttribute("user.id", userId)
  }
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
    res.status(401).send("Unauthorized")
    return
  }
  const idToken = req.headers.authorization.split("Bearer ")[1]
  if (!res.locals) {
    res.locals = {}
  }

  try {
    const tracer = trace.getTracer("gffft-tracer")
    const span = tracer.startSpan("firebase-auth")
    const iamUser = await authenticateAndFetchUser(idToken)
    span.end()

    if (!iamUser) {
      res.status(403).send("Unauthorized: Token expired")
      return
    }

    res.locals.iamUser = iamUser
  } catch (error) {
    console.log(error)
    res.status(403).send("Unauthorized: Token expired")
    return
  }

  next()
}

export const requiredGffftMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let uid = req.body.uid || req.params.uid
  const gid = req.body.gid || req.params.gid

  if (uid == "me" && res.locals.iamUser) {
    uid = res.locals.iamUser.id
  }

  const gffft = await getGffft(uid, gid)
  if (gffft == null) {
    res.sendStatus(404)
    return
  }
  res.locals.gffft = gffft
  res.locals.uid = uid
  res.locals.gid = gffft.id

  const membership = await getGffftMembership(uid, gid, res.locals.iamUser.id)
  if (!membership) {
    console.log("poster is not a member of this gffft")
    res.sendStatus(403)
    return
  }
  if (membership.type == TYPE_PENDING || membership.type == TYPE_REJECTED) {
    console.log("poster is not an approved member of this board")
    res.sendStatus(403)
    return
  }
  res.locals.gffftMembership = membership

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
