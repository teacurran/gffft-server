
import {all, field, get, ref, Ref, update, upset, value} from "typesaurus"
import {LoggedInUser} from "../auth"
import {gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {GffftAdminCountUpset, GffftAnonCountUpset, GffftMemberCountUpset, GffftOwnerCountUpset, GffftStats,
} from "../gfffts/gffft_models"
import {usersCollection} from "../users/user_data"


export async function updateCounter(ref: Ref<GffftStats>, type: string, changeValue: number): Promise<void> {
  switch (type) {
  case "owner":
    return upset<GffftOwnerCountUpset>(ref, {
      ownerCount: value("increment", changeValue),
    })
  case "admin":
    return upset<GffftAdminCountUpset>(ref, {
      adminCount: value("increment", changeValue),
    })
  case "member":
    return await upset<GffftMemberCountUpset>(ref, {
      memberCount: value("increment", changeValue),
    })
  case "anon":
    return await upset<GffftAnonCountUpset>(ref, {
      anonCount: value("increment", changeValue),
    })
  default:
    break
  }
}

type CounterName = "galleryPhotos" | "galleryVideos" | "boardThreads" | "boardPosts" | "linkSetItems";
export async function incrementMemberCounter(counterName: CounterName, uid: string, gid: string): Promise<void> {
  const gfffts = gffftsCollection(ref(usersCollection, uid))
  const gffftRef = ref(gfffts, gid)

  const writes: Promise<void>[] = []
  const membersCollection = gffftsMembersCollection(gffftRef)
  all(membersCollection).then(async (results) => {
    for (const snapshot of results) {
      if (snapshot.data != null) {
        writes.push(update(membersCollection, snapshot.ref.id, [
          field(["updateCounters", counterName], value("increment", 1)),
        ]))
      }
    }
  })
  await Promise.all(writes)
}

export async function resetMemberCounter(iamUser: LoggedInUser | null,
  counterName: CounterName, uid: string, gid: string): Promise<void> {
  // reset user notification counts
  if (iamUser != null) {
    const gfffts = gffftsCollection(ref(usersCollection, uid))
    const gffftRef = ref(gfffts, gid)
    const membersCollection = gffftsMembersCollection(gffftRef)
    const memberRef = ref(membersCollection, iamUser.id)

    const snapshot = await get(memberRef)
    if (snapshot?.data != null) {
      return update(membersCollection, iamUser.id,
        [field(["updateCounters", counterName], 0)],
      )
    }
  }
}
