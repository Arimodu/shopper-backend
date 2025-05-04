import getDbEngine from '@src/db/dbEngine';
import { IReq, IRes } from './types';
import { z } from 'zod';


const Validators = {
  param: z.object({
    itemId: z.string().uuid(),
  }),
  create: z.object({
    listId: z.string().uuid(),
    order: z.number(),
    content: z.string(),
  }),
  patch: z.object({
    order: z.number().optional(),
    content: z.string().optional(),
    isDone: z.boolean().optional(),
  }),
  delete: z.object({
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
  }),
} as const;


async function get(req: IReq, res: IRes) {
  const { itemId } = Validators.param.parse(req.body);
  const dbEngine = getDbEngine();
  const data = await dbEngine.getItemById(itemId);

  if (!data) {
    res.status(404).send(`Could not find item ${itemId}`);
    return;
  }

  res.status(200).json(data);
}

async function create(req: IReq, res: IRes) {
  const { listId, order, content } = Validators.create.parse(req.body);

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

  const data = await dbEngine.addItem(listId, order, content);
  res.status(201).json(data);
}

async function patch(req: IReq, res: IRes) {
  const { itemId } = Validators.param.parse(req.params);
  const { order, content, isDone } = Validators.patch.parse(req.body);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListByItemId(itemId);

  const user = req.session.user!;

  if (!list) {
    res.status(404).send(`Could not find list containing item ${itemId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(401).send('You are not invited or owner of this list');
    return;
  }

  const data = await dbEngine.updateItem(itemId, order, content, isDone);
  res.status(data ? 200 : 500).json(data ?? { error: 'Internal server error'});
}

async function delete_(req: IReq, res: IRes) {
  const { itemId } = Validators.param.parse(req.params);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListByItemId(itemId);

  const user = req.session.user!;

  if (!list) {
    res.status(404).send(`Could not find list containing item ${itemId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(401).send('You are not invited or owner of this list');
    return;
  }

  const data = await dbEngine.deleteItem(itemId);
  res.status(data ? 200 : 500).send();
}

export default {
  get,
  create,
  patch,
  delete: delete_,
} as const;
