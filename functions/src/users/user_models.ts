import {Ref} from "typesaurus"
import {Gffft} from "../gfffts/gffft_models"

export type User = {
    id: string
    username: string
    usernameCounter: number
    createdAt?: Date
    updatedAt?: Date
  }

export type UsernameChange = {
    username: string
    usernameCounter: number
    updatedAt?: Date
  }

export type UserBookmark = {
    id: string
    gffftRef: Ref<Gffft>
    name: string
    notes?: string
    createdAt: Date
  }

export interface HydratedUserBookmark extends UserBookmark {
  gffft: Gffft | undefined
}

export type Adjective = {
    count: number;
    random: number;
  }

export type Noun = {
    count: number;
    random: number;
  }

export type Verb = {
    count: number;
    random: number;
  }
