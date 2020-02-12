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
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    // store/insert a new document
    const data = req.rawBody.toString();

    let lines = data.split('\n');
    lines.forEach((line) => {
      console.log(`line: ${line}`);
      addToCollection(COLLECTION_NOUNS, line);
    });

    return res.status(200).send("done?");

    // const ttl = Number.parseInt(data.ttl);
    // const ciphertext = (data.ciphertext || '').replace(/[^a-zA-Z0-9-]*/g, '');
    // const created = new Date().getTime();
    // return firestore.collection(COLLECTION_NAME)
    //   .add({created, ttl, ciphertext})
    //   .then(doc => {
    //     return res.status(200).send(doc);
    //   }).catch(err => {
    //     console.error(err);
    //     return res.status(404).send({error: 'unable to store', err});
    //   });
  }
  // read/retrieve an existing document by id
  // if (!(req.query && req.query.id)) {
  //   return res.status(404).send({error: 'No Id'});
  // }
  // const id = req.query.id.replace(/[^a-zA-Z0-9]/g, '').trim();
  // if (!(id && id.length)) {
  //   return res.status(404).send({error: 'Empty Id'});
  // }
  // return firestore.collection(COLLECTION_NAME)
  //   .doc(id)
  //   .get()
  //   .then(doc => {
  //     if (!(doc && doc.exists)) {
  //       return res.status(404).send({error: 'Unable to find the document'});
  //     }
  //     const data = doc.data();
  //     return res.status(200).send(data);
  //   }).catch(err => {
  //     console.error(err);
  //     return res.status(404).send({error: 'Unable to retrieve the document'});
  //   });
});

exports.addVerbs = functions.https.onRequest(async (req, res) => {
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    // store/insert a new document
    const data = req.rawBody.toString();

    let lines = data.split('\n');
    lines.forEach((line) => {
      addToCollection(COLLECTION_VERBS, line);
    });

    return res.status(200).send("done??");
  }
});

exports.addAdjectives = functions.https.onRequest(async (req, res) => {
  console.log("addAdjectives() called");
  let writes = [];
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    // store/insert a new document
    const data = req.rawBody.toString();

    let lines = data.split('\n');
    console.log(`processing ${lines.length}`);
    const batch = firestore.batch();
    lines.forEach((line) => {
      writes.push(addToCollection(COLLECTION_ADJECTIVES, line));
    });
  }
  await Promise.all(writes).then(() => {
    return res.status(200).send("promise I'm done");
  });
});

const addToCollection = async (collection, value) => {
  // if (!value) {
  //   return false;
  // }
  console.log(`line: ${value}`);
  let line_split = value.split(' ');
  // if (line_split.length <= 0) {
  //   return false;
  // }
  let word = line_split[0];
  console.log(`word: ${word}`);
  if (!word.includes('_')) {
    return firestore.collection(collection)
      .doc(word)
      .set({count: 0});
  }
  return Promise.resolve('word is invalid');
};

