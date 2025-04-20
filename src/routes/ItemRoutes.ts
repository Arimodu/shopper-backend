/* eslint-disable max-len */
import { isBoolean, isNumber, isString } from 'jet-validators';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import getDbEngine from '@src/db/dbEngine';

import { IReq, IRes } from './types';
import { parseReq } from './util';
import { isValidUUIDv4 } from '@src/util/validators';


/******************************************************************************
                                Constants
******************************************************************************/

const Validators = {
  param: parseReq({ itemId: isValidUUIDv4 }),
  create: parseReq({ listId: isValidUUIDv4, order: isNumber, content: isString }),
  patch: parseReq({ listId: isValidUUIDv4, order: isNumber, content: isString, isDone: isBoolean}),
  delete: parseReq({ listId: isValidUUIDv4, itemId: isValidUUIDv4 }),
} as const;


/******************************************************************************
                                Functions
******************************************************************************/

// Possibly implement later - requires DB impl
/*async function get(req: IReq, res: IRes) {
  const listId = req.params.listId as string;
  const itemId = req.params.itemId as string;
  if (!listId || !itemId) throw new ValidationError([]);
  const dbEngine = getDbEngine();
  const data = await dbEngine.getListById(listId);
  res.status(HttpStatusCodes.OK).json(data);
}*/

async function create(req: IReq, res: IRes) {
  const { listId, order, content } = Validators.create(req.body);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  const user = req.session.user!;

  if (!list) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('You are not invited or owner of this list');
    return;
  }

  const data = await dbEngine.addItem(listId, order, content);
  res.status(HttpStatusCodes.CREATED).json(data);
}

async function patch(req: IReq, res: IRes) {
  const { itemId } = Validators.param(req.params);
  const { listId, order, content, isDone } = Validators.patch(req.body);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  const user = req.session.user!;

  if (!list) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('You are not invited or owner of this list');
    return;
  }  

  const item = list.items.find((item) => item._id == itemId);

  if (!item) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find item ${itemId}`);
    return;
  }

  item.content = content;
  item.isDone = isDone;
  item.order = order;

  const data = await dbEngine.updateItem(listId, item);
  res.status(HttpStatusCodes.OK).json(data);
}

async function delete_(req: IReq, res: IRes) {
  const { itemId } = Validators.param(req.params);
  const { listId } = Validators.delete(req.body);

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  const user = req.session.user!;

  if (!list) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id && !list.invitedUsers.includes(user._id)) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('You are not invited or owner of this list');
    return;
  }

  const data = await dbEngine.deleteItem(listId, itemId);
  res.status(HttpStatusCodes.OK).send(data);
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  //get,
  create,
  patch,
  delete: delete_,
} as const;
