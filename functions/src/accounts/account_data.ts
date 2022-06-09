import {limit, query, where} from "typesaurus"
import {Account, accountsCollection} from "./account_models"
import {itemOrNull} from "../common/data"

export async function getAccountByHandle(handle: string): Promise<Account | null> {
  return query(accountsCollection, [
    where("handle", "==", handle),
    limit(1),
  ]).then(itemOrNull)
}

