import express, { NextFunction, Request, Response } from 'express';

import * as functions from "firebase-functions"
import * as firebaseAdmin from "firebase-admin"
import {getUser} from './data'
import UserRecord = firebaseAdmin.auth.UserRecord;

import {
    ContainerTypes,
    createValidator,
    ValidatedRequest,
    ValidatedRequestSchema
  } from 'express-joi-validation';
import { requiredAuthentication } from '../auth';
import { iamUserToJson } from './data';
import { User } from './models';
const Joi = require('joi');

const userUpdateRequestParams = Joi.object({
    uid: Joi.string().required(),
    displayName: Joi.string().required()
  });
  export interface UserUpdateRequest extends ValidatedRequestSchema {
    [ContainerTypes.Body]: {
      uid: string;
      displayName: string;
    };
  }
  
const router = express.Router();
const validator = createValidator();

router.get(
    "/me",
    requiredAuthentication,
    async (req: Request, res: Response) => {
      const iamUser: UserRecord = res.locals.iamUser
      const user: User = await getUser(iamUser.uid)

      res.json(iamUserToJson(iamUser, user))
    }
)



export default router;
