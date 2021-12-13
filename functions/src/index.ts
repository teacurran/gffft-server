import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"
import {User} from "./models"
import express, {Request, Response} from "express"
import {requiredAuthentication} from "./auth"
import cors from "cors"
import UserRecord = firebaseAdmin.auth.UserRecord;

import bodyParser = require("body-parser")
import {getUser, iamUserToJson} from "./helpers/users"


// import Firestore = require('firebase/firestore');

const PROJECTID = "gffft-auth"

// const COLLECTION_USERS = "users"
// const users = collection<User>(COLLECTION_USERS)
// const adjectives = collection<User>(COLLECTION_ADJECTIVES)
// const nouns = collection<User>(COLLECTION_NOUNS)

// const verbs = collection<User>(COLLECTION_VERBS)

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

apiApp.get(
    "/authenticated",
    requiredAuthentication,
    (req: Request, res: Response) => {
      res.send(`Authenticated! user: ${res.locals.user}`)
    }
)

apiApp.get(
    "/users/me",
    requiredAuthentication,
    async (req: Request, res: Response) => {
      const iamUser: UserRecord = res.locals.iamUser
      const user: User = await getUser(iamUser.uid)

      res.json(iamUserToJson(iamUser, user))
    }
)

// define google cloud function name
export const api = functions.https.onRequest(apiApp)

/*
exports.addNouns = functions.https.onRequest(async (req, res) => {
  console.log('addNouns()');
  let writes = [];
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    let lines = req.rawBody.toString().split('\n');
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_NOUNS, line.split(' ').reverse()));
    });
    await Promise.all(writes).then(() => {
      return res.status(200).send("promise I'm done");
    });
  }
});

exports.addVerbs = functions.https.onRequest(async (req, res) => {
  let writes = [];
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    let lines = req.rawBody.toString().split('\n');
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_VERBS, line));
    });
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done");
  });
});

exports.addAdjectives = functions.https.onRequest(async (req, res) => {
  console.log("addAdjectives() called");
  let writes = [];
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    let lines = req.rawBody.toString().split('\n');
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_ADJECTIVES, line));
    });
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done");
  });
});

const addToCollection = async (collection, value) => {
  if (!value) {
    return Promise.resolve('no value');
  }
  console.log(`line: ${value}`);
  let line_split = Array.isArray(value) ? value : value.split(' ');
  if (line_split.length <= 0) {
    return Promise.resolve('no value');
  }
  let word = line_split[0];
  console.log(`word: ${word}`);
  if (!word.includes('_') && !word.includes('-')) {
    return firestore.collection(collection)
      .doc(word)
      .set({
        count: 0,
        random: randomInt(0, 9999999)
      });
  }
  return Promise.resolve('word is invalid');
};
*/
