import { z } from 'zod';
import { IReq, IRes } from './types';

import getDbEngine from '@src/db/dbEngine';
import { hashPassword } from '@src/util/authHelper';

const Validators = {
  query: z.object({
    queryString: z.string(),
  }),
  update: z.object({
    name: z.string().optional(),
    password: z.string().optional(), 
  }),
} as const;

function me(req: IReq, res: IRes) {
  const user = req.session.user!;
  res.status(200).json({
    _id: user._id,
    name: user.name
  });
}

//async function query(req: IReq, res: IRes) {
//  
//}

async function update(req: IReq, res: IRes) {
  const { name, password } = Validators.update.parse(req.body);
  const user = req.session.user!;

  const dbEngine = getDbEngine();
  const data = await dbEngine.updateUser(user._id, name, password ? await hashPassword(password) : undefined);

  // Log out the user if the password changed
  if (password && data) {
    req.session.destroy((err) => console.error(err));
  }

  res.status(data ? 200 : 500).json(data ? {
    _id: data._id,
    name: data.name
  } : {
    error: 'Internal server error'
  });
}

async function delete_(req: IReq, res: IRes) {
  const user = req.session.user!;

  const dbEngine = getDbEngine();
  const data = await dbEngine.deleteUser(user._id);
  req.session.destroy((err) => {
     console.info('Session cleared');
     if (err) console.error(err);
  });
  res.clearCookie('connect.sid').status(data ? 200 : 500).send(data ? null : {
    error: 'Internal server error'
  });
}

export default {
  me,
  update,
  delete: delete_,
} as const;
