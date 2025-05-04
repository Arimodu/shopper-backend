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
    archived: z.boolean().optional(),
  }),
  acl: z.object({
    listId: z.string().uuid(),
    userId: z.string().uuid(),
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
  const { name, owner, archived } = Validators.patch.parse(req.body);

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

  const data = await dbEngine.updateList(listId, name, owner, archived);

  res.status(data ? 200 : 500).json(data ?? { error: 'Internal server error'});
}

async function addUser(req: IReq, res: IRes) {
  const { listId, userId } = Validators.acl.parse(req.body);

  const currentUser = req.session.user!;
  
  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  if (!list) {
    res.status(404).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != currentUser._id) {
    res.status(401).send('Only the owner can add to the acl');
    return;
  }

  if (currentUser._id === userId) {
    res.status(400).send('You cannot add yourself to your own list');
    return;
  }

  const data = dbEngine.addUserToList(listId, userId);
  res.status(200).json(data);
}

async function removeUser(req: IReq, res: IRes) {
  const { listId, userId } = Validators.acl.parse(req.body);

  const currentUser = req.session.user!;
  
  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  if (!list) {
    res.status(404).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != currentUser._id && userId != currentUser._id) {
    res.status(401).send('Only the owner can remove other users from the acl');
    return;
  }

  if (list.owner === userId) {
    res.status(400).send('You cannot remove yourself from the list as the owner');
    return;
  }

  const data = dbEngine.removeUserFromList(listId, userId);
  res.status(200).json(data);
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
  addUser,
  removeUser,
  delete: delete_,
} as const;
