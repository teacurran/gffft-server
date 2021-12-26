import {Gffft} from "./models"

export interface IGffftType {
    id: string
    key?: string
    name?: string
    description?: string
  }

/**
   * to Json
   * @param {Gffft} gffft to serialize
   * @param {User} user
   * @return {IIAMUserType}
   */
export function gffftToJson(
    gffft: Gffft,
): IGffftType | null {
  if (gffft == null) {
    return null
  }
  const item: IGffftType = {
    id: gffft.id,
    key: gffft.key,
    name: gffft.name,
    description: gffft.description,
  }
  return item
}

