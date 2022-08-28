import firebaseAdmin = require("firebase-admin")

export const MOCK_AUTH_HEADER = {
  alg: "none",
  typ: "JWT",
}

export const MOCK_AUTH_USER_1 = {
  name: "Peach Mountain",
  email: "peach.mountain.713@test.com",
  email_verified: true,
  auth_time: 1661438657,
  user_id: "mock-user-1",
  firebase: {
    identities: {
      email: ["peach.mountain.713@test.com"],
      ["google.com"]: ["1724356731553789742452122495892234985362"],
    },
    sign_in_provider: "google.com",
  },
  iat: 1661438657,
  exp: "gffft-auth",
  iss: "https://securetoken.google.com/gffft-auth",
  sub: "GqsV7Odc85B75tcFgMYFcSJQgfGS",
}

export const MOCK_AUTH_USER_2 = {
  name: "Taco Salad",
  email: "taco.salad@test.com",
  email_verified: true,
  auth_time: 1661438646,
  user_id: "mock-user-2",
  firebase: {
    identities: {
      email: ["taco.salad@test.com"],
      ["google.com"]: ["86556486535465"],
    },
    sign_in_provider: "google.com",
  },
  iat: 1661438646,
  exp: "gffft-auth",
  iss: "https://securetoken.google.com/gffft-auth",
  sub: "GqsV7Odc85B75tcFgMYFcSJQgfGS",
}

export const MOCK_AUTH_USER_3 = {
  name: "Lisa Burns",
  email: "lburns@example.com",
  email_verified: true,
  auth_time: 1661438946,
  user_id: "mock-user-3",
  firebase: {
    identities: {
      email: ["lburns@example.com"],
      ["google.com"]: ["6546541654984621654954"],
    },
    sign_in_provider: "google.com",
  },
  iat: 1661438646,
  exp: "gffft-auth",
  iss: "https://securetoken.google.com/gffft-auth",
  sub: "u9ouhijbjhbuhoh9uhiuj",
}

const AUTH_HEADER_ENC = Buffer.from(JSON.stringify(MOCK_AUTH_HEADER), "ascii").toString("base64")
const AUTH_USER_ENC = Buffer.from(JSON.stringify(MOCK_AUTH_USER_1), "ascii").toString("base64")
export const MOCK_AUTH_BEARER = `${AUTH_HEADER_ENC}.${AUTH_USER_ENC}.`
export const USER_1_AUTH = {Authorization: `Bearer ${MOCK_AUTH_BEARER}`}

const AUTH_USER_2_ENC = Buffer.from(JSON.stringify(MOCK_AUTH_USER_2), "ascii").toString("base64")
export const MOCK_AUTH_BEARER_2 = `${AUTH_HEADER_ENC}.${AUTH_USER_2_ENC}.`
export const USER_2_AUTH = {Authorization: `Bearer ${MOCK_AUTH_BEARER_2}`}

const AUTH_USER_3_ENC = Buffer.from(JSON.stringify(MOCK_AUTH_USER_3), "ascii").toString("base64")
export const MOCK_AUTH_BEARER_3 = `${AUTH_HEADER_ENC}.${AUTH_USER_3_ENC}.`
export const USER_3_AUTH = {Authorization: `Bearer ${MOCK_AUTH_BEARER_3}`}

export class MockFirebaseInit {
  private static instance: MockFirebaseInit
  private initialized = false

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private async initializeFirebase() {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      if (!firebaseAdmin.app) {
        firebaseAdmin.initializeApp()
      }

      await Promise.all(
        [MOCK_AUTH_USER_1, MOCK_AUTH_USER_2, MOCK_AUTH_USER_3].map((mockAuthUser) => {
          return firebaseAdmin
            .auth()
            .createUser({
              displayName: mockAuthUser.name,
              email: mockAuthUser.email,
              uid: mockAuthUser.user_id,
            })
            .catch((error) => console.log(error.message))
        })
      )
    }
    this.initialized = true
    return Promise.resolve()
  }

  static getInstance(): MockFirebaseInit {
    if (!MockFirebaseInit.instance) {
      MockFirebaseInit.instance = new MockFirebaseInit()
    }

    return MockFirebaseInit.instance
  }

  public async init(): Promise<void> {
    if (!this.initialized) {
      await this.initializeFirebase()
    }
    return Promise.resolve()
  }
}
