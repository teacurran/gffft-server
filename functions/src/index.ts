import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"

import {WriteResult} from "@google-cloud/firestore"
import {addAdjective, addNoun, addVerb} from "./users/user_data"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

export const addNouns = functions.https.onRequest(async (req, res) => {
  console.log("addNouns()")
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addNoun(line.split(" ").reverse()[0]))
    })
    await Promise.all(writes).then(() => {
      return res.status(200).send("promise I'm done")
    })
  }
})

export const addVerbs = functions.https.onRequest(async (req, res) => {
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addVerb(line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})


export const addAdjectives = functions.https.onRequest(async (req, res) => {
  console.log("addAdjectives() called")
  const writes: Promise<WriteResult | string>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addAdjective(line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})

export * from "./counters"
export * from "./resizer/index"
