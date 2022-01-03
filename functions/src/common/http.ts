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
  private httpClient: AxiosInstance;
  private authToken?: string;

  constructor(baseUrl: string, authToken?: string) {
    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers,
      withCredentials: true,
    })
    this.authToken = authToken

    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        const {response} = error
        return this.handleError(response)
      }
    )

    this.httpClient.interceptors.request.use((config) => {
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

  // eslint-disable-next-line require-jsdoc
  private get http(): AxiosInstance {
    return this.httpClient
  }

  request<T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R> {
    return this.http.request(config)
  }

  get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    console.log(`GET: ${url}`)
    return this.http.get<T, R>(url, config)
  }

  post<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: T,
    config?: AxiosRequestConfig
  ): Promise<R> {
    return this.http.post<T, R>(url, data, config)
  }

  put<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: T,
    config?: AxiosRequestConfig
  ): Promise<R> {
    console.log(`PUT: ${url}`)
    return this.http.put<T, R>(url, data, config)
  }

  delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    console.log(`DELETE: ${url}`)
    return this.http.delete<T, R>(url, config)
  }

  // Handle global app errors
  // We can handle generic app errors depending on the status code
  private handleError(error: { status: unknown }) {
    const {status} = error

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
