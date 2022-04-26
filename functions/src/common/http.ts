/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse} from "axios"

enum StatusCode {
  Unauthorized = 401,
  Forbidden = 403,
  TooManyRequests = 429,
  InternalServerError = 500,
}

const headers: Readonly<AxiosRequestHeaders> = {
  "Accept": "application/json",
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Credentials": "true",
  "X-Requested-With": "XMLHttpRequest",
}

export class Http {
  private axios: AxiosInstance;
  private authToken?: string;

  constructor(baseUrl: string, authToken?: string) {
    this.axios = axios.create({
      baseURL: baseUrl,
      headers,
      withCredentials: authToken ? true : false,
    })
    this.authToken = authToken

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const {response} = error
        return this.handleError(response)
      }
    )

    this.axios.interceptors.request.use((config) => {
      if (this.authToken) {
        if (!config.headers) {
          config.headers = {}
        }
        config.headers.Authorization = `Bearer ${this.authToken}`
      }
      return config
    }, function(error) {
      return Promise.reject(error)
    })
  }

  request<T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R> {
    return this.axios.request(config)
  }

  async get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    console.log(`GET: ${url}`)
    return this.axios.get<T, R>(url, config)
  }

  post<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: T,
    config?: AxiosRequestConfig
  ): Promise<R> {
    return this.axios.post<T, R>(url, data, config)
  }

  put<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: T,
    config?: AxiosRequestConfig
  ): Promise<R> {
    console.log(`PUT: ${url}`)
    return this.axios.put<T, R>(url, data, config)
  }

  delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    console.log(`DELETE: ${url}`)
    return this.axios.delete<T, R>(url, config)
  }

  // Handle global app errors
  // We can handle generic app errors depending on the status code
  private handleError(error: { status: unknown }) {
    if (!error) {
      return
    }
    const status = error.status ? error.status : ""

    switch (status) {
    case StatusCode.InternalServerError: {
      // Handle InternalServerError
      break
    }
    case StatusCode.Forbidden: {
      // Handle Forbidden
      break
    }
    case StatusCode.Unauthorized: {
      // Handle Unauthorized
      break
    }
    case StatusCode.TooManyRequests: {
      // Handle TooManyRequests
      break
    }
    }

    return Promise.reject(error)
  }
}
