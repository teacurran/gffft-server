import firebaseAdmin = require("firebase-admin");

export const MOCK_AUTH_HEADER = {
  alg: "none",
  typ: "JWT",
}

export const MOCK_AUTH_USER = {
  name: "Peach Mountain",
  email: "peach.mountain.713@test.com",
  email_verified: true,
  auth_time: 1661438657,
  user_id: "28SkWBeCNXCclihiSZkbyIAqFDrq",
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
  user_id: "uohkj8768hgfDrq233087",
  firebase: {
    identities: {
      email: ["taco.salad@test.com"],
      ["google.com"]: ["1223876768768776546546"],
    },
    sign_in_provider: "google.com",
  },
  iat: 1661438646,
  exp: "gweb-restor-dev",
  iss: "https://securetoken.google.com/gffft-auth",
  sub: "GqsV7Odc85B75tcFgMYFcSJQgfGS",
}

const AUTH_HEADER_ENC = Buffer.from(
  JSON.stringify(MOCK_AUTH_HEADER),
  "ascii"
).toString("base64")
const AUTH_USER_ENC = Buffer.from(
  JSON.stringify(MOCK_AUTH_USER),
  "ascii"
).toString("base64")
export const MOCK_AUTH_BEARER = `${AUTH_HEADER_ENC}.${AUTH_USER_ENC}.`
export const USER_1_AUTH = {Authorization: `Bearer ${MOCK_AUTH_BEARER}`}

const AUTH_USER_2_ENC = Buffer.from(
  JSON.stringify(MOCK_AUTH_USER_2),
  "ascii"
).toString("base64")
export const MOCK_AUTH_BEARER_2 = `${AUTH_HEADER_ENC}.${AUTH_USER_2_ENC}.`
export const USER_2_AUTH = {Authorization: `Bearer ${MOCK_AUTH_BEARER_2}`}

export class MockFirebaseInit {
  private static instance: MockFirebaseInit;
  private initialized = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private async initializeFirebase() {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST && !firebaseAdmin.app) {
      firebaseAdmin.initializeApp()
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
