/* eslint-disable max-len */
import { isString } from 'jet-validators';

import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import getDbEngine from '@src/db/dbEngine';

import { IReq, IRes } from './types';
import { parseReq } from './util';
import { isValidUUIDv4 } from '@src/util/validators';


/******************************************************************************
                                Constants
******************************************************************************/

const Validators = {
  get: parseReq({ listId: isValidUUIDv4 }),
  create: parseReq({ listName: isString }),
  patch: parseReq({ name: isString, owner: isValidUUIDv4}),
  patchParams: parseReq({ listId: isValidUUIDv4 }),
  delete_: parseReq({ listId: isValidUUIDv4 }),
} as const;


/******************************************************************************
                                Functions
******************************************************************************/

async function get(req: IReq, res: IRes) {
  const { listId } = Validators.get(req.params);
  const dbEngine = getDbEngine();
  const data = await dbEngine.getListById(listId);
  res.status(HttpStatusCodes.OK).json(data);
}

async function create(req: IReq, res: IRes) {
  const { listName } = Validators.create(req.body);
  const dbEngine = getDbEngine();
  const data = await dbEngine.createList(listName, req.session.user!._id); // Set current user as owner
  res.status(HttpStatusCodes.CREATED).json(data);
}

async function patch(req: IReq, res: IRes) {
  const { listId } = Validators.patchParams(req.params);
  const { name, owner } = Validators.patch(req.body);

  const user = req.session.user!;

  const dbEngine = getDbEngine();
  const list = await dbEngine.getListById(listId);

  if (!list) {
    res.status(HttpStatusCodes.NOT_FOUND).send(`Could not find list ${listId}`);
    return;
  }

  if (list.owner != user._id) {
    res.status(HttpStatusCodes.UNAUTHORIZED).send('Only the owner can edit a list');
    return;
  }

  list.name = name;
  list.owner = owner;

  const data = await dbEngine.updateList(list);

  res.status(HttpStatusCodes.OK).json(data);
}

async function delete_(req: IReq, res: IRes) {
  const { listId } = Validators.delete_(req.params);

  const dbEngine = getDbEngine();
  const data = await dbEngine.deleteList(listId);
  res.status(HttpStatusCodes.OK).send(data);
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  get,
  create,
  patch,
  delete: delete_,
} as const;
