/* eslint-disable max-len */
import { isNumber } from 'jet-validators';
import { transform } from 'jet-validators/utils';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import User from '@src/models/User';

import { IReq, IRes } from './types';
import { parseReq } from './util';
import getDbEngine from '@src/db/dbEngine';


/******************************************************************************
                                Constants
******************************************************************************/

const Validators = {
  update: parseReq({ user: User.test }),
  delete: parseReq({ id: transform(Number, isNumber) }),
} as const;


/******************************************************************************
                                Functions
******************************************************************************/

async function update(req: IReq, res: IRes) {
  const { user } = Validators.update(req.body);
  const sessionUser = req.session.user!;

  const dbEngine = getDbEngine();
  const existingUser = await dbEngine.getUserById(user._id);

  if (!existingUser) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find user ${user._id}`);
    return;
  }

  // Check if the session user is authorized to update this user
  if (sessionUser._id !== user._id) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('You can only update yourself');
    return;
  }

  // Update user fields
  existingUser.name = user.name;
  // Note: Password and other field updates will be set later
  // Cant really be arsed to implement that at 2AM

  // Requires DB implementation
  //const data = await dbEngine.updateUser(existingUser);
  //res.status(HttpStatusCodes.OK).json(data);
}

async function delete_(req: IReq, res: IRes) {
  const { id } = Validators.delete(req.params);
  const sessionUser = req.session.user!;

  const dbEngine = getDbEngine();
  const existingUser = await dbEngine.getUserById(id.toString());

  if (!existingUser) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find user ${id}`);
    return;
  }

  // Check if the session user is authorized to delete this user
  if (sessionUser._id !== id.toString()) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('You are not authorized to delete this user');
    return;
  }

  // Requires DB implementation
  //const result = await dbEngine.deleteUser(id.toString());
  //res.status(HttpStatusCodes.OK).send(result);
}


/******************************************************************************
                                Export default
******************************************************************************/

export default {
  update,
  delete: delete_,
} as const;
