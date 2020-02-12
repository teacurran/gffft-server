const functions = require('firebase-functions');
const Firestore = require('@google-cloud/firestore');
const PROJECTID = 'gffft-auth';

const COLLECTION_NOUNS = 'username_nouns';
const COLLECTION_VERBS = 'username_verbs';
const COLLECTION_ADJECTIVES = 'username_adjectives';

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true,
});

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
  if (!word.includes('_')) {
    return firestore.collection(collection)
      .doc(word)
      .set({count: 0});
  }
  return Promise.resolve('word is invalid');
};

