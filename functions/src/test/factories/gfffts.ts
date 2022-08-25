import {Factory} from "fishery"
import {ref, set} from "typesaurus"
import {DEFAULT_GFFFT_KEY, gffftsCollection} from "../../gfffts/gffft_data"
import {Gffft} from "../../gfffts/gffft_models"

export default Factory.define<Gffft>(({sequence, onCreate}) => {
  onCreate(async (gffft) => {
    const userGfffts = gffftsCollection(gffft.uid || "test-uid")
    const gffftRef = ref(userGfffts, id)

    gffft.nameLower = gffft.name.toLowerCase()
    await set<Gffft>(gffftRef, gffft)
    return gffft
  })

  const id = sequence.toString()
  const gffft: Gffft = {
    id: id,
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
