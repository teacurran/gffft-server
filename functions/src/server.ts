import express from "express"
import bodyParser = require("body-parser");
import * as firebaseAdmin from "firebase-admin"
import cors from "cors"
import jsdocSwagger from "express-jsdoc-swagger"
import openApiOptions from "./openapi/openapi_api"
import boards from "./boards/board_api"
import gfffts from "./gfffts/gffft_api"
import users from "./users/user_api"

const PORT = process.env.PORT || 3000

async function start() {
  const PROJECTID = "gffft-auth"
  firebaseAdmin.initializeApp({
    projectId: PROJECTID,
  })

  // TODO: restrict this to our approved origins
  const corsOptions: cors.CorsOptions = {
    origin: true,
  }
  const corsMiddleware = cors(corsOptions)

  const app = express()
  // eslint-disable-next-line new-cap
  const api = express.Router()

  app.use(bodyParser.json({limit: "50mb"}))
  app.use(bodyParser.urlencoded({extended: true}))
  app.use(corsMiddleware)
  jsdocSwagger(app)(openApiOptions)

  api.use("/users", users)
  api.use("/gfffts", gfffts)
  api.use("/boards", boards)

  app.use("/api", api)

  // start the express server
  app.listen(PORT, () => {
    console.info(`Server listening on port: ${PORT}`)
  })
}

start()

