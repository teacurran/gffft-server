import express from "express"
import bodyParser = require("body-parser");
import * as firebaseAdmin from "firebase-admin"
import cors from "cors"
import jsdocSwagger from "express-jsdoc-swagger"
import openApiOptions from "./openapi/openapi_api"
import boards from "./boards/board_api"
import galleries from "./galleries/gallery_api"
import gfffts from "./gfffts/gffft_api"
import users from "./users/user_api"

const PORT = process.env.PORT || 3000

async function start() {
  const PROJECTID = "gffft-auth"
  firebaseAdmin.initializeApp({
    projectId: PROJECTID,
    storageBucket: "gffft-auth.appspot.com",
  })


  const app = express()

  // TODO: restrict for prod
  const corsOptions: cors.CorsOptions = {
    origin: true,
  }
  const corsMiddleware = cors(corsOptions)
  app.use(corsMiddleware)

  // eslint-disable-next-line new-cap
  const api = express.Router()

  app.use(bodyParser.json({limit: "50mb"}))
  app.use(bodyParser.urlencoded({extended: true}))
  jsdocSwagger(app)(openApiOptions)

  api.use("/users", users)
  api.use("/galleries", galleries)
  api.use("/gfffts", gfffts)
  api.use("/boards", boards)

  app.use("/api", api)

  app.listen(PORT, () => {
    console.info(`Server listening on port: ${PORT}`)
  })
}

start()

