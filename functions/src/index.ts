import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"
import express, {} from "express"
import cors from "cors"
import jsdocSwagger from "express-jsdoc-swagger"

import bodyParser = require("body-parser")

import boards from "./boards/api"
import gfffts from "./gfffts/gffft_api"
import users from "./users/api"
import {WriteResult} from "@google-cloud/firestore"
import {addAdjective, addNoun, addVerb} from "./users/data"
import openApiOptions from "./openapi/openapi_api"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

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

jsdocSwagger(apiApp)(openApiOptions)

// define google cloud function name
export const api = functions.https.onRequest(apiApp)

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


