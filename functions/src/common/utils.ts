import Libhoney from "libhoney"

export const randomInt = (low: number, high: number): number => {
  return Math.floor(Math.random() * (high - low) + low)
}

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined
}

export const hny = new Libhoney({
  writeKey: "160965349838cd907f5532a79ee04410",
  dataset: "gffft",
})
