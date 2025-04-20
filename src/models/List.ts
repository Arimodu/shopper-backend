import { isString, isStringArray } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';
import { isItemArray, isValidUUIDv4 } from '@src/util/validators';

import { IItem } from './Item';

import { v4 as uuidv4 } from 'uuid';


/******************************************************************************
                                 Constants
******************************************************************************/

const DEFAULT_LIST_VALS = (): IList => ({
  _id: uuidv4(),
  name: 'List',
  owner: '00000000-0000-0000-0000-000000000000',
  invitedUsers: [],
  items: [],
});


/******************************************************************************
                                  Types
******************************************************************************/

export interface IList {
  _id: string;
  name: string;
  owner: string;
  invitedUsers: string[];
  items: IItem[];
}


/******************************************************************************
                                  Setup
******************************************************************************/

// Initialize the "parseList" function
const parseList = parseObject<IList>({
  _id: isValidUUIDv4,
  name: isString,
  owner: isValidUUIDv4,
  invitedUsers: isStringArray,
  items: isItemArray,
});


/******************************************************************************
                                 Functions
******************************************************************************/

/**
 * New List object.
 */
function newList(List?: Partial<IList>): IList {
  const retVal = { ...DEFAULT_LIST_VALS(), ...List };
  return parseList(retVal, errors => {
    throw new Error('Setup new List failed ' + JSON.stringify(errors, null, 2));
  });
}

/**
 * Check is a List object. For the route validation.
 */
function testList(arg: unknown, errCb?: TParseOnError): arg is IList {
  return !!parseList(arg, errCb);
}


/******************************************************************************
                                Export default
******************************************************************************/

export default {
  new: newList,
  test: testList,
} as const;