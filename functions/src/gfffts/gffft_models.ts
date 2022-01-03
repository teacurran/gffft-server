export type Gffft = {
    id: string
    key: string
    name: string
    nameLower: string
    description: string
    intro?: string
    tags?: string[]
    enabled: boolean
    allowMembers: boolean
    requireApproval: boolean
    enableAltHandles: boolean
    pagesEnabled: boolean
    pagesWhoCanView?: string
    pagesWhoCanEdit?: string
    boardEnabled: boolean
    boardWhoCanView?: string
    boardWhoCanPost?: string
    galleryEnabled: boolean
    galleryWhoCanView?: string
    galleryWhoCanPost?: string
    createdAt?: Date
    updatedAt?: Date
  }
