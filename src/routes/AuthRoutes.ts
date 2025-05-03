import bcrypt from 'bcrypt';
import getDbEngine from '@src/db/dbEngine';
import { IReq, IRes } from './types';
import { z } from 'zod';
import { hashPassword } from '@src/util/authHelper';

const Validators = {
  login: z.object({
    name: z.string(),
    password: z.string(),
  }),
  register: z.object({
    name: z.string(),
    password: z.string(),
  }),
} as const;

async function login(req: IReq, res: IRes) {
  const { name, password } = Validators.login.parse(req.body);
  const dbEngine = getDbEngine();

  const user = await dbEngine.getUserByName(name);
  if (!user) {
    res.status(404).send('User not found');
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.bcrypt);
  if (!isPasswordValid) {
    res.status(401).send('Invalid password');
    return;
  }

  req.session.user = user;
  res.status(200).json({
    _id: user._id,
    name: user.name,
  });
}

async function register(req: IReq, res: IRes) {
  const { name, password } = Validators.register.parse(req.body);
  const dbEngine = getDbEngine();

  const existingUser = await dbEngine.getUserByName(name);
  if (existingUser) {
    res.status(409).send('Username already exists');
    return;
  }

  const hashedPassword = await hashPassword(password);
  const user = await dbEngine.createUser(name, hashedPassword);

  req.session.user = user;
  res.status(201).json({
    _id: user._id,
    name: user.name,
  });
}

export default {
  login,
  register,
} as const;
