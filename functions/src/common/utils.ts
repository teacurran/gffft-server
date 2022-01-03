export const randomInt = (low: number, high: number): number => {
  return Math.floor(Math.random() * (high - low) + low)
}

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined
}
