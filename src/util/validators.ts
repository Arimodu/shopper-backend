import Item, { IItem } from '@src/models/Item';
import User, { IUser } from '@src/models/User';
import { isNumber, isDate } from 'jet-validators';
import { transform } from 'jet-validators/utils';
import { validate, version } from 'uuid';


/******************************************************************************
                                Functions
******************************************************************************/

/**
 * Validates uuid
 */
export function isValidUUIDv4(arg: unknown): arg is string {
  return validate(arg) && version(arg) === 4;
}

/**
 * Validates User[] arrays
 */
export function isUserArray(arg: unknown): arg is IUser[] {
  return Array.isArray(arg) && arg.every((v, i, a) => User.test(v));
}

/**
 * Validates Item[] arrays
 */
export function isItemArray(arg: unknown): arg is IItem[] {
  return Array.isArray(arg) && arg.every((v, i, a) => User.test(v));
}

/**
 * Convert to date object then check is a validate date.
 */
export const transIsDate = transform(
  arg => new Date(arg as string),
  arg => isDate(arg),
);
