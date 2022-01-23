import {WHO_OWNER} from "../boards/board_data"
import {Calendar} from "./calendar_models"

export interface ICalendarType {
    id: string
    name?: string
    description?: string
    updatedAt: Date | null
    whoCanView: string
    whoCanPost: string
    events: number
  }

export function calendarToJson(
  calendar: Calendar | null,
): ICalendarType | null {
  if (calendar == null) {
    return null
  }
  const item: ICalendarType = {
    id: calendar.id,
    name: calendar.name,
    description: calendar.description,
    updatedAt: calendar.updatedAt ?? new Date(),
    whoCanView: calendar.whoCanView ?? WHO_OWNER,
    whoCanPost: calendar.whoCanPost ?? WHO_OWNER,
    events: 0,
  }
  return item
}

