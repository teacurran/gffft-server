const functions = require('firebase-functions');
const Firestore = require('@google-cloud/firestore');
const PROJECTID = 'gffft-auth';

const COLLECTION_ADJECTIVES = 'username_adjectives';
const COLLECTION_NOUNS = 'username_nouns';
const COLLECTION_USERS = 'users';
const COLLECTION_VERBS = 'username_verbs';

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true,
});

exports.setUsername = functions.https.onRequest(async (req, res) => {
    let [noun, verb, adjective] = await Promise.all([
      getRandomItem(COLLECTION_NOUNS),
      getRandomItem(COLLECTION_VERBS),
      getRandomItem(COLLECTION_ADJECTIVES)
    ]).catch(error => {
      console.log(`error: ${error.message}`);
    });

    let username_raw;
    if (Math.floor(Math.random() * 2) === 0) {
      username_raw = verb.id+ "_" + noun.id;
      await firestore.collection(COLLECTION_VERBS).doc(verb.id).set({count: verb.data.count ? verb.data.count + 1 : 1});
    } else {
      username_raw = adjective.id + "_" + noun.id;
      await firestore.collection(COLLECTION_ADJECTIVES).doc(adjective.id).set({count: (adjective.data.count) ? adjective.data.count + 1 : 1});
    }
    await firestore.collection(COLLECTION_NOUNS).doc(noun.id).set({count: (noun.data.count) ? noun.data.count + 1 : 1});

    let username_counter = 1;
    let existing_user = await firestore.collection(COLLECTION_USERS)
        .where('username_raw', '==', username_raw)
        .orderBy('username_counter', 'desc').limit(1).get()
        .then(snapshot => {
            return (snapshot.empty) ? null : snapshot.docs[0];
        });
    if (existing_user) {
      username_counter = existing_user.data.username_counter;
    }

    const username = username_counter > 1 ? username_raw + "_" + username_counter : username_raw;
    return firestore.collection(COLLECTION_USERS).doc(req.body.id)
                  .set({username: username, username_raw: username_raw, username_counter: username_counter})
                  .then(() => res.json({username: username}))
});

const getRandomItem = async (collection) => {
  return firestore.collection(collection)
    .orderBy('random', 'asc')
    .limit(1)
    .get()
    .then(snapshot => {
      return (snapshot.empty) ? null : snapshot.docs[0];
    });
};

const randomInt = (low, high) => {
  return Math.floor(Math.random() * (high - low) + low)
};

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

