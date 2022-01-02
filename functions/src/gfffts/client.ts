import {Http} from "../common/http"
import {IGffftType} from "./types"

export class GffftClient {
    client: Http

    constructor(baseUrl: string, authToken?: string) {
      // todo: generate a bearer token that will get me past the firebase auth

      this.client = new Http(baseUrl, authToken)
    }

    getDefaultGffft(): Promise<IGffftType> {
      return this.client.get("/gfffts/default")
    }

    updateGffft(data: IGffftType): Promise<void> {
      return this.client.put("/gfffts", data)
    }
}
