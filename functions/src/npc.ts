import * as firebaseAdmin from "firebase-admin"
import {createNpc} from "./npcs/data"
import {UserClient} from "./users/client"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

const isProduction = process.env.NODE_ENV === "production"

const baseUrl = isProduction ? "https://us-central1-gffft-auth.cloudfunctions.net/api" : "http://localhost:5000/gffft-auth/us-central1/api";

(async () => {
  const npcId = "user_activity_bot"
  const token = `npc-${npcId}-npc#1000`

  await createNpc(npcId)

  const userClient = new UserClient(baseUrl, token)
  await userClient.getMe().catch((e)=>console.log(e))
})().catch((e: any) => {
  console.error(e)
  // Deal with the fact the chain failed
})


