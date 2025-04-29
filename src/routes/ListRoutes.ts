/* eslint-disable max-len */
import getDbEngine from '@src/db/dbEngine';

import { IReq, IRes } from './types';
import { z } from 'zod';

const Validators = {
  param: z.object({
    listId: z.string().uuid(),
  }),
  create: z.object({
    listName: z.string(),
  }),
  patch: z.object({
    name: z.string().optional(),
    owner: z.string().uuid().optional(),
  }),
} as const;

async function get(req: IReq, res: IRes) {
  const { listId } = Validators.param.parse(req.params);
  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  const user = req.session.user!;

  if (!list) {
    res.status(404).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(401).send('You are not invited or owner of this list');
    return;
  }

  res.status(200).json(list);
}

async function create(req: IReq, res: IRes) {
  const { listName } = Validators.create.parse(req.body);
  const dbEngine = getDbEngine();
  const data = await dbEngine.createList(listName, req.session.user!._id); // Set current user as owner
  res.status(201).json(data);
}

async function patch(req: IReq, res: IRes) {
  const { listId } = Validators.param.parse(req.params);
  const { name, owner } = Validators.patch.parse(req.body);

  const user = req.session.user!;

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  if (!list) {
    res.status(404).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id) {
    res.status(401).send('Only the owner can edit a list');
    return;
  }

  const data = await dbEngine.updateList(listId, name, owner);

  res.status(data ? 200 : 500).json(data ?? { error: 'Internal server error'});
}

async function delete_(req: IReq, res: IRes) {
  const { listId } = Validators.param.parse(req.params);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  const user = req.session.user!;

  if (!list) {
    res.status(404).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id) {
    res.status(401).send('Only the owner can delete a list');
    return;
  }

  const data = await dbEngine.deleteList(listId);
  res.status(data ? 200 : 500).json(data ?? { error: 'Internal server error'});
}

export default {
  get,
  create,
  patch,
  delete: delete_,
} as const;
