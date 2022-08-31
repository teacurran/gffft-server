import {Factory} from "fishery"
import {createGffft, DEFAULT_GFFFT_KEY} from "../../gfffts/gffft_data"
import {Gffft} from "../../gfffts/gffft_models"

export default Factory.define<Gffft>(({sequence, onCreate}) => {
  onCreate(async (item) => {
    return createGffft(`${item.uid}`, item, "sysop")
  })

  const gffft: Gffft = {
    id: sequence.toString(),
    uid: sequence.toString(),
    key: DEFAULT_GFFFT_KEY,
    name: "Test Gffft",
    nameLower: "test gffft",
    fruitCode: "",
    description: "description of my gffft",
    intro: "some intro text",
    enabled: true,
    allowMembers: true,
    requireApproval: false,
    enableAltHandles: true,
  }

  return gffft
})

