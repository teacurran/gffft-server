import {Gffft} from "./models"

export interface IGffftType {
    id?: string
    key?: string
    name: string;
    description: string;
    intro?: string,
    tags?: string[],
    enabled: boolean,
    allowMembers: boolean,
    requireApproval: boolean,
    enableAltHandles: boolean,
    pagesEnabled: boolean,
    pagesWhoCanView?: string,
    pagesWhoCanEdit?: string,
    boardEnabled: boolean,
    boardWhoCanView?: string,
    boardWhoCanPost?: string,
    galleryEnabled: boolean,
    galleryWhoCanView?: string,
    galleryWhoCanPost?: string,

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
    intro: gffft.intro,
    tags: gffft.tags,
    enabled: gffft.enabled,
    allowMembers: gffft.allowMembers,
    requireApproval: gffft.requireApproval,
    enableAltHandles: gffft.enableAltHandles,
    pagesEnabled: gffft.pagesEnabled,
    pagesWhoCanView: gffft.pagesWhoCanView,
    pagesWhoCanEdit: gffft.pagesWhoCanEdit,
    boardEnabled: gffft.boardEnabled,
    boardWhoCanPost: gffft.boardWhoCanPost,
    boardWhoCanView: gffft.boardWhoCanView,
    galleryEnabled: gffft.galleryEnabled,
    galleryWhoCanView: gffft.boardWhoCanView,
    galleryWhoCanPost: gffft.galleryWhoCanPost,
  }
  return item
}

