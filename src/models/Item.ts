import { isBoolean, isNumber, isString } from 'jet-validators';
import { parseObject, TParseOnError } from 'jet-validators/utils';
import { isValidUUIDv4 } from '@src/util/validators';

import { v4 as uuidv4 } from 'uuid';

/******************************************************************************
                                 Constants
******************************************************************************/

const DEFAULT_ITEM_VALS = (): IItem => ({
  _id: uuidv4(),
  order: -1,
  content: '',
  isDone: false,
});


/******************************************************************************
                                  Types
******************************************************************************/

export interface IItem {
  _id: string;
  order: number;
  content: string;
  isDone: boolean;
}


/******************************************************************************
                                  Setup
******************************************************************************/

// Initialize the "parseItem" function
const parseItem = parseObject<IItem>({
  _id: isValidUUIDv4,
  order: isNumber,
  content: isString,
  isDone: isBoolean,
});


/******************************************************************************
                                 Functions
******************************************************************************/

/**
 * New user object.
 */
function newItem(user?: Partial<IItem>): IItem {
  const retVal = { ...DEFAULT_ITEM_VALS(), ...user };
  return parseItem(retVal, errors => {
    throw new Error('Setup new user failed ' + JSON.stringify(errors, null, 2));
  });
}

/**
 * Check is an Item object. For the route validation.
 */
function testItem(arg: unknown, errCb?: TParseOnError): arg is IItem {
  return !!parseItem(arg, errCb);
}


/******************************************************************************
                                Export default
******************************************************************************/

export default {
  new: newItem,
  test: testItem,
} as const;