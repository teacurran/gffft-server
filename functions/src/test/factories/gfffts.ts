import {Factory} from "fishery"
import {ref, set} from "typesaurus"
import {createGffft, DEFAULT_GFFFT_KEY, getUniqueFruitCode, gffftsCollection} from "../../gfffts/gffft_data"
import {Gffft} from "../../gfffts/gffft_models"

export default Factory.define<Gffft>(({sequence, onCreate, afterCreate}) => {
  onCreate(async (gffft) => {
    return createGffft(gffft.uid || "test-uid", gffft, "sysop")
  })

  afterCreate(async (gffft) => {
    if (!gffft.fruitCode || gffft.fruitCode === "") {
      const userGfffts = gffftsCollection(gffft.uid || "test-uid")
      const gffftRef = ref(userGfffts, id)

      const [fruitCode] = await getUniqueFruitCode()
      gffft.fruitCode = fruitCode
      await set<Gffft>(gffftRef, gffft)
    }
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

