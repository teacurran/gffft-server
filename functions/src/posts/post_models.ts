import {Ref, subcollection} from "typesaurus"
import {Account, accountsCollection} from "../accounts/account_models"
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

export const postsCollection = subcollection<Post, Account>("posts", accountsCollection)
export const attachmentCollection = subcollection<PostAttachment, Post, Account>("attachments", postsCollection)
