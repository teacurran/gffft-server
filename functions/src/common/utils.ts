export const randomInt = (low: number, high: number): number => {
  return Math.floor(Math.random() * (high - low) + low)
}

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined
}

export interface EnumObject {
  [enumValue: number]: string;
}

export function getEnumValues(e: EnumObject): string[] {
  return Object.keys(e).map((_, index) => e[index])
}
