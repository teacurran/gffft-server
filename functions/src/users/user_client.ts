import {Http} from "../common/http"
import {IUserType} from "./user_data"

export class UserClient {
    client: Http

    constructor(baseUrl: string, authToken?: string) {
      // todo: generate a bearer token that will get me past the firebase auth

      this.client = new Http(baseUrl, authToken)
    }

    getMe(): Promise<IUserType> {
      return this.client.get("/users/me")
    }
}
