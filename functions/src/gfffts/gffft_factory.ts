import * as faker from "faker"
import {Factory} from "fishery"
import {DeepPartial} from "fishery/dist/types"
import {IGffftPutType} from "./gffft_types"


export const gffftFactory = Factory.define<IGffftPutType>(() => {
  const name = faker.company.companyName()
  return {
    name: name,
    description: faker.random.words(20),
    intro: faker.random.words(400),
    tags: [faker.random.word(), faker.random.word(), faker.random.word()],
    enabled: faker.datatype.boolean(),
    allowMembers: faker.datatype.boolean(),
    enableAltHandles: faker.datatype.boolean(),
    requireApproval: faker.datatype.boolean(),
    boardEnabled: faker.datatype.boolean(),
    calendarEnabled: faker.datatype.boolean(),
    galleryEnabled: faker.datatype.boolean(),
    notebookEnabled: faker.datatype.boolean(),
  }
})

export async function createGffft(
  overrides: DeepPartial<IGffftPutType>
): Promise<IGffftPutType> {
  return gffftFactory.build(overrides)
}

