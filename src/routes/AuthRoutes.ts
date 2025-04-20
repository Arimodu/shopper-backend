import bcrypt from 'bcrypt';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import getDbEngine from '@src/db/dbEngine';
import { IReq, IRes } from './types';
import { parseReq } from './util';
import { isString } from 'jet-validators';

/******************************************************************************
                                Constants
******************************************************************************/

const Validators = {
  login: parseReq({ name: isString, password: isString }),
  register: parseReq({ name: isString, password: isString }),
} as const;

/******************************************************************************
                                Routes
******************************************************************************/

async function login(req: IReq, res: IRes) {
  const { name, password } = Validators.login(req.body);
  const dbEngine = getDbEngine();

  const user = await dbEngine.getUserByName(name);
  if (!user) {
    res.status(HttpStatusCodes.NOT_FOUND).send('User not found');
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.bcrypt);
  if (!isPasswordValid) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('Invalid password');
    return;
  }

  req.session.user = user;
  res.status(HttpStatusCodes.OK).json(user);
}

async function register(req: IReq, res: IRes) {
  const { name, password } = Validators.register(req.body);
  const dbEngine = getDbEngine();

  const existingUser = await dbEngine.getUserByName(name);
  if (existingUser) {
    res.status(HttpStatusCodes.CONFLICT).send('Username already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await dbEngine.createUser(name, hashedPassword);

  req.session.user = user;
  res.status(HttpStatusCodes.CREATED).json(user);
}

/******************************************************************************
                                Export
******************************************************************************/

export default {
  login,
  register,
} as const;
