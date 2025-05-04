import { IItem } from './Item';

export interface IList {
  _id: string;
  name: string;
  owner: string;
  archived: boolean;
  invitedUsers: string[];
  items: IItem[];
}