import {query, subcollection, where, limit, add, pathToRef, get, upset} from "typesaurus"
import {Calendar} from "./calendar_models"
import {User} from "../users/user_models"
import {Gffft} from "../gfffts/gffft_models"
import {gffftsCollection} from "../gfffts/gffft_data"

const DEFAULT_CALENDAR_KEY = "default"
const DEFAULT_CALENDAR_NAME = "calendar"

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
    where("key", "==", DEFAULT_CALENDAR_KEY),
    limit(1),
  ]).then(async (results) => {
    if (results.length > 0) {
      const item = results[0].data
      item.id = results[0].ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_CALENDAR_NAME
        await upset<Calendar>(results[0].ref, item)
      }

      return item
    }
    return null
  })

  if (calendar == null) {
    calendar = {
      key: DEFAULT_CALENDAR_KEY,
    } as Calendar
    const result = await add<Calendar>(userGalleries, calendar)
    calendar.id = result.id
  }

  return calendar
}

export async function getCalendarByRef(refId: string): Promise<Calendar | null> {
  const itemRef = pathToRef<Calendar>(refId)
  return get(itemRef).then(async (snapshot) => {
    if (snapshot != null) {
      const item = snapshot.data
      item.id = snapshot.ref.id

      // upgrading old data
      if (!item.name) {
        item.name = DEFAULT_CALENDAR_NAME
        await upset<Calendar>(itemRef, item)
      }

      return item
    }
    return null
  })
}
