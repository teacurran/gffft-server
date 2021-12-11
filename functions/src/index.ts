import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import {collection, get, set, query, where, limit} from "typesaurus";
import {User} from "./models";

// import Firestore = require('firebase/firestore');

const PROJECTID = "gffft-auth";
const COLLECTION_ADJECTIVES = "username_adjectives";
const COLLECTION_NOUNS = "username_nouns";
const COLLECTION_USERS = "users";
const COLLECTION_VERBS = "username_verbs";

const users = collection<User>(COLLECTION_USERS);
// const adjectives = collection<User>(COLLECTION_ADJECTIVES)
// const nouns = collection<User>(COLLECTION_NOUNS)
// const verbs = collection<User>(COLLECTION_VERBS)

firebaseAdmin.initializeApp({
  projectId: PROJECTID,
});

const firestore = firebaseAdmin.firestore();

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const setUsername = functions.https.onRequest(async (req, res) => {
  // see if this user exists, get their username counter
  const user = await get(users, req.body.id).then((snapshot) => {
    if (snapshot != null) {
      return snapshot.data;
    }
    return null;
  });

  let usernameCounter = 0;
  if (user) {
    usernameCounter = user.usernameCounter;
    if (isNaN(usernameCounter)) {
      usernameCounter = 1;
    }
  }
  usernameCounter++;

  // todo: might ned a transaction here
  // get a new username for them
  const username = await getUniqueUsername();

  set(users, req.body.id, {
    username: username,
    usernameCounter: usernameCounter,
  } as User).then(() => res.json({username: username}));
});

/* eslint no-await-in-loop: "off" */
const getUniqueUsername = async () => {
  let counter = 0;
  while (counter < 1000) {
    counter++;

    // get a new username
    const username = await getUsername();

    // check to see if someone already has this username
    const existingUser = await query(users, [
      where("username", "==", username),
      limit(1),
    ]).then((results) => {
      if (results.length > 0) {
        return results[0];
      }
      return null;
    });

    // no matches, use this one
    if (!existingUser) {
      return username;
    }
  }
  return null;
};

const getUsername = async () => {
  const [noun, verb, adjective] = await Promise.all([
    getRandomItem(COLLECTION_NOUNS),
    getRandomItem(COLLECTION_VERBS),
    getRandomItem(COLLECTION_ADJECTIVES),
  ]).catch((error) => {
    console.log(`error: ${error.message}`);
    throw error;
  });

  let usernameRaw;
  if (Math.floor(Math.random() * 2) === 0) {
    usernameRaw = verb?.id + "_" + noun?.id;
    await firestore
        .collection(COLLECTION_VERBS)
        .doc(verb.id)
        .set(
            {
              count: verb.get("count") ? verb.get("count") + 1 : 1,
              random: randomInt(0, 9999999),
            },
            {merge: true}
        );
  } else {
    usernameRaw = adjective.id + "_" + noun.id;
    await firestore
        .collection(COLLECTION_ADJECTIVES)
        .doc(adjective.id)
        .set(
            {
              count: adjective.get("count") ? adjective.get("count") + 1 : 1,
              random: randomInt(0, 9999999),
            },
            {merge: true}
        );
  }
  await firestore
      .collection(COLLECTION_NOUNS)
      .doc(noun.id)
      .set(
          {
            count: noun.get("count") ? noun.get("count") + 1 : 1,
            random: randomInt(0, 9999999),
          },
          {merge: true}
      );
  return usernameRaw;
};

const getRandomItem = (collection: string) => {
  return firestore
      .collection(collection)
      .orderBy("random", "asc")
      .limit(1)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          throw new Error(
              "unable to find random item from collection:" + collection
          );
        }
        return snapshot.docs[0];
      });
};

const randomInt = (low: number, high: number) => {
  return Math.floor(Math.random() * (high - low) + low);
};

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
