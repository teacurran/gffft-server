import {Http} from "../common/http"
import {IUserType} from "./data"

export class UserClient {
    client: Http

    constructor(baseUrl: string) {
      // todo: generate a bearer token that will get me past the firebase auth

      this.client = new Http(baseUrl)
    }

    getMe(): Promise<IUserType> {
      return this.client.get("/me")
    }
}
