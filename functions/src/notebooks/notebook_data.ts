import {query, subcollection, where, limit, add} from "typesaurus"
import {Notebook} from "./notebook_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"

const DEFAULT_BOARD_KEY = "default"

export const notebookCollection = subcollection<Notebook, Gffft, User>("notebooks", gffftsCollection)

/**
 * gets or creates the default notebook for a user
 * @param {string} userId
 * @param {string} gffftId
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultNotebook(userId: string, gffftId: string): Promise<Notebook> {
  const userGalleries = notebookCollection([userId, gffftId])

  let notebook = await query(userGalleries, [
    where("key", "==", DEFAULT_BOARD_KEY),
    limit(1),
  ]).then((results) => {
    if (results.length > 0) {
      const value = results[0].data
      value.id = results[0].ref.id
      return value
    }
    return null
  })

  if (notebook == null) {
    notebook = {
      key: DEFAULT_BOARD_KEY,
    } as Notebook
    const result = await add<Notebook>(userGalleries, notebook)
    notebook.id = result.id
  }

  return notebook
}

