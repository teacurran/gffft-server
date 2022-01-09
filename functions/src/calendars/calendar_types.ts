import {Calendar} from "./calendar_models"

export interface ICalendarType {
    id: string
    name?: string
    description?: string
  }

export function calendarToJson(
  calendar: Calendar,
): ICalendarType | null {
  if (calendar == null) {
    return null
  }
  const item: ICalendarType = {
    id: calendar.id,
    name: calendar.name,
    description: calendar.description,
  }
  return item
}

