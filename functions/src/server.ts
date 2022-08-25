import express, {Request, Response} from "express"
import bodyParser = require("body-parser");
import * as firebaseAdmin from "firebase-admin"
import cors from "cors"
import jsdocSwagger from "express-jsdoc-swagger"
import openApiOptions from "./openapi/openapi_api"
import boards from "./boards/board_api"
import galleries from "./galleries/gallery_api"
import gfffts from "./gfffts/gffft_api"
import users from "./users/user_api"
import links from "./link-sets/link_set_api"
import compression from "compression"
import firebase from "@firebase/app-compat"

const PORT = process.env.PORT || 3000

if (!firebase.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: "gffft-auth",
    storageBucket: "gffft-auth.appspot.com",
  })
}

const app = express()

app.disable("x-powered-by")

// restrict for prod
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

app.use(compression())

api.use("/users", users)
api.use("/galleries", galleries)
api.use("/gfffts", gfffts)
api.use("/boards", boards)
api.use("/links", links)

app.use("/api", api)

app.get("/_ah/warmup", (req: Request, res: Response) => {
  res.sendStatus(204)
})

app.listen(PORT, () => {
  console.info(`Server listening on port: ${PORT}`)
})

export default app
