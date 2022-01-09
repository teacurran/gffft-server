import {query, subcollection, where, limit, add} from "typesaurus"
import {Calendar} from "./calendar_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"

const DEFAULT_BOARD_KEY = "default"

export const calendarCollection = subcollection<Calendar, Gffft, User>("calendars", gffftsCollection)

/**
 * gets or creates the default calendar for a user
 * @param {string} userId
 * @param {string} gffftId
 * @return {IIAMUserType}
 */
export async function getOrCreateDefaultCalendar(userId: string, gffftId: string): Promise<Calendar> {
  const userGalleries = calendarCollection([userId, gffftId])

  let calendar = await query(userGalleries, [
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

  if (calendar == null) {
    calendar = {
      key: DEFAULT_BOARD_KEY,
    } as Calendar
    const result = await add<Calendar>(userGalleries, calendar)
    calendar.id = result.id
  }

  return calendar
}

