import { IItem } from './Item';

export interface IList {
  _id: string;
  name: string;
  owner: string;
  invitedUsers: string[];
  items: IItem[];
}