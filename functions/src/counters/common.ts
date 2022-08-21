
import {all, field, get, ref, update, value} from "typesaurus"
import {LoggedInUser} from "../accounts/auth"
import {gffftsCollection, gffftsMembersCollection} from "../gfffts/gffft_data"
import {usersCollection} from "../users/user_data"

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
