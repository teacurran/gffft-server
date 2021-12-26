import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"
import express, {} from "express"
import cors from "cors"

import bodyParser = require("body-parser")

import boards from "./boards/api"
import gfffts from "./gfffts/api"
import users from "./users/api"

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
