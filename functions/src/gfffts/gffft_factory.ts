import * as faker from "faker"
import {Factory} from "fishery"
import {DeepPartial} from "fishery/dist/types"
import {IGffftType} from "./gffft_types"


export const gffftFactory = Factory.define<IGffftType>(() => {
  const name = faker.company.companyName()
  return {
    name: name,
    description: faker.random.words(20),
    allowMembers: faker.datatype.boolean(),
    boardEnabled: faker.datatype.boolean(),
    enableAltHandles: faker.datatype.boolean(),
    enabled: faker.datatype.boolean(),
    galleryEnabled: faker.datatype.boolean(),
    pagesEnabled: faker.datatype.boolean(),
    requireApproval: faker.datatype.boolean(),
    intro: faker.random.words(400),
  }
})

export async function createGffft(
  overrides: DeepPartial<IGffftType>
): Promise<IGffftType> {
  return gffftFactory.build(overrides)
}

