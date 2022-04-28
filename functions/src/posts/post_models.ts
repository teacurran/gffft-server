import {collection, Ref, subcollection} from "typesaurus"
import {Account} from "../accounts/account_models"
import {PostType} from "./post_type"

export type Post = {
    part: string
    snowflake: string
    createdAt: Date
    updatedAt: Date
    parent: string
    repostId: string
    type: PostType
    author: Ref<Account>
    content: string
    repostCount: number
    likeCount: number
    replyCount: number
}

export type PostAttachment = {
    fileName: string
    filePath: string
    thumbnail: boolean
    createdAt: Date
}

export const postsCollection = collection<Post>("posts")
export const attachmentCollection = subcollection<PostAttachment, Post>("attachments", postsCollection)
