import {Http} from "../common/http"
import {IGffftFruitCode, IGffftId, IGffftPutType, IGffftType} from "./gffft_types"

export class GffftClient {
    client: Http

    constructor(baseUrl: string, authToken?: string) {
      // todo: generate a bearer token that will get me past the firebase auth

      this.client = new Http(baseUrl, authToken)
    }

    async getDefaultGffft(): Promise<IGffftType> {
      return this.client.get<IGffftType>("/gfffts/default").then((response) => Promise.resolve(response.data))
    }

    async updateGffft(data: IGffftPutType): Promise<void> {
      return this.client.put("/gfffts", data)
    }

    async updateFruitCode(gffftId: IGffftId): Promise<IGffftFruitCode> {
      return this.client.put<IGffftId, IGffftFruitCode>("/gfffts/fruit-code", {
        uid: gffftId.uid,
        gid: gffftId.gid,
      })
    }
}
