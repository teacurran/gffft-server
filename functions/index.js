const Readable = require('stream').Readable
const readline = require('readline')

const functions = require('firebase-functions');
const Firestore = require('@google-cloud/firestore');
const PROJECTID = 'gffft-auth';

const COLLECTION_NOUNS = 'username_nouns';

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true,
});

exports.addNouns = functions.https.onRequest(async (req, res) => {
  if (req.method === 'DELETE') throw new Error('not yet built');
  if (req.method === 'POST') {
    // store/insert a new document
    const data = req.rawBody.toString();

    let lines = data.split('\n');
    console.log('loading');
    lines.forEach((line) => {
      console.log(`line: ${line}`);
      let word = line.split(' ')[0];
      console.log(`word: ${word}`);
      if (word.length > 0 && !word.includes('_')) {
        firestore.collection(COLLECTION_NOUNS)
          .doc(word)
          .set({count: 0});
      }
    });
    console.log('done');

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