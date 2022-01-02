import * as firebaseAdmin from "firebase-admin"
import {GffftClient} from "./gfffts/client"
import {createGffft} from "./gfffts/gffft_factory"
import {createNpc} from "./npcs/data"
import {UserClient} from "./users/client"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

const isProduction = process.env.NODE_ENV === "production"

const baseUrl = isProduction ? "https://us-central1-gffft-auth.cloudfunctions.net/api" : "http://localhost:5000/gffft-auth/us-central1/api"

async function runNpc(npcId: string, userId: string) {
  const token = `npc-${npcId}-${userId}`

  const userClient = new UserClient(baseUrl, token)
  await userClient.getMe().catch((e)=>console.log(e))

  const gffftClient = new GffftClient(baseUrl, token)
  const gffft = await createGffft({})
  gffftClient.updateGffft(gffft)
}

(async () => {
  const npcId = "user_activity_bot"

  await createNpc(npcId)
  for (let count = 1000; count < 1100; count++) {
    console.log(`running runner for npc# ${count}`)
    await runNpc(npcId, `npc#${count}`)
  }
})().catch((e: any) => {
  console.error(e)
  // Deal with the fact the chain failed
})


