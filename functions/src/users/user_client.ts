import {Http} from "../common/http"
import {IUserType} from "./user_interfaces"

export class UserClient {
    client: Http

    constructor(baseUrl: string, authToken?: string) {
      this.client = new Http(baseUrl, authToken)
    }

    async getMe(): Promise<IUserType> {
      return this.client.get<IUserType>("/users/me")
        .then((response) => Promise.resolve(response.data))
    }
}

