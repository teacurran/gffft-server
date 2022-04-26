import * as firebaseAdmin from "firebase-admin"
import {GffftClient} from "./gfffts/gffft_client"
import {createGffft} from "./gfffts/gffft_factory"
import {UserClient} from "./users/user_client"

const PROJECTID = "gffft-auth"
firebaseAdmin.initializeApp({
  projectId: PROJECTID,
})

const isProduction = process.env.NODE_ENV === "production"

const baseUrl = isProduction ? "https://gffft-auth.appspot.com/api" : "http://localhost:3000/api"

async function runNpc(npcId: string, userId: string) {
  const token = `npc-${npcId}-${userId}`
  console.log(`calling baseUrl:${baseUrl}`)

  const userClient = new UserClient(baseUrl, token)
  const user = await userClient.getMe()
  console.log(`got user: ${user.id}`)

  const gffftClient = new GffftClient(baseUrl, token)
  const gffftStub = await createGffft({})
  await gffftClient.updateGffft(gffftStub)

  const gffft = await gffftClient.getDefaultGffft()

  console.log(`working with gffft:${gffft.gid} name:${gffft.name}`)
  if (user && gffft && gffft.gid) {
    gffftClient.updateFruitCode({
      uid: user.id,
      gid: gffft.gid,
    }).catch((e)=>console.log(e))
  }
}

(async () => {
  const npcId = "user_activity_bot"
  // await createNpc(npcId)

  for (let count = 1000; count < 1100; count++) {
    console.log(`running runner for npc# ${count}`)
    await runNpc(npcId, `NPC.${count}`)
  }
})().catch((e) => {
  console.error(e)
  // Deal with the fact the chain failed
})


