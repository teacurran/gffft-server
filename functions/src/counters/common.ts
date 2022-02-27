
import {Ref, upset, value} from "typesaurus"
import {
  GffftAdminCounter, GffftAnonCounter,
  GffftMemberCounter, GffftOwnerCounter, GffftStats,
} from "../gfffts/gffft_models"


export async function updateCounter(ref: Ref<GffftStats>, type: string, changeValue: number): Promise<void> {
  switch (type) {
  case "owner":
    return upset<GffftOwnerCounter>(ref, {
      ownerCount: value("increment", changeValue),
    })
  case "admin":
    return upset<GffftAdminCounter>(ref, {
      adminCount: value("increment", changeValue),
    })
  case "member":
    return await upset<GffftMemberCounter>(ref, {
      memberCount: value("increment", changeValue),
    })
  case "anon":
    return await upset<GffftAnonCounter>(ref, {
      anonCount: value("increment", changeValue),
    })
  default:
    break
  }
}
