import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"
import express, {} from "express"
import cors from "cors"

import bodyParser = require("body-parser")

import boards from "./boards/api"
import gfffts from "./gfffts/api"
import users from "./users/api"
import {randomInt} from "./utils"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})
const COLLECTION_NOUNS = "nouns"
const COLLECTION_VERBS = "verbs"
const COLLECTION_ADJECTIVES = "adjectives"

// initialize express server
const apiApp = express()

apiApp.use(bodyParser.json({limit: "50mb"}))
apiApp.use(bodyParser.urlencoded({extended: true}))

const corsOptions: cors.CorsOptions = {
  origin: true,
}
const corsMiddleware = cors(corsOptions)
apiApp.use(corsMiddleware)

apiApp.use("/users", users)
apiApp.use("/gfffts", gfffts)
apiApp.use("/boards", boards)

const firestore = firebaseAdmin.firestore()

// define google cloud function name
export const api = functions.https.onRequest(apiApp)

export const addNouns = functions.https.onRequest(async (req, res) => {
  console.log("addNouns()")
  const writes: Promise<any>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_NOUNS, line.split(" ").reverse()[0]))
    })
    await Promise.all(writes).then(() => {
      return res.status(200).send("promise I'm done")
    })
  }
})

export const addVerbs = functions.https.onRequest(async (req, res) => {
  const writes: Promise<any>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_VERBS, line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})

export const addAdjectives = functions.https.onRequest(async (req, res) => {
  console.log("addAdjectives() called")
  const writes: Promise<any>[] = []
  if (req.method === "DELETE") throw new Error("not yet built")
  if (req.method === "POST") {
    const lines = req.rawBody.toString().split("\n")
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_ADJECTIVES, line))
    })
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done")
  })
})

const addToCollection = async (collection: string, value: string) => {
  if (!value) {
    return Promise.resolve("no value")
  }
  console.log(`line: ${value}`)
  const lineSplit = Array.isArray(value) ? value : value.split(" ")
  if (lineSplit.length <= 0) {
    return Promise.resolve("no value")
  }
  const word = lineSplit[0]
  console.log(`word: ${word}`)
  if (!word.includes("_") && !word.includes("-")) {
    return firestore.collection(collection)
        .doc(word)
        .set({
          count: 0,
          random: randomInt(0, 9999999),
        })
  }
  return Promise.resolve("word is invalid")
}
