import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';
import MongoDBEngine from './mongoDB';
import PostgreDBEngine from './postgreDB';

export interface IDbEngine {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // User operations
  createUser(name: string, bcrypt: string): Promise<IUser>;
  getUserById(id: string): Promise<IUser | null>;
  getUserByName(name: string): Promise<IUser | null>;
  updateUser(userId: string, name?: string, bcrypt?: string): Promise<IUser | null>;
  deleteUser(userId: string): Promise<boolean>;
  
  // List operations
  createList(name: string, owner: string): Promise<IList>;
  getListById(id: string): Promise<IList | null>;
  getListByItemId(itemId: string): Promise<IList | null>;
  getListsByUserId(userId: string): Promise<IList[]>;
  updateList(listId: string, name?: string, owner?: string, archived?: boolean): Promise<IList | null>;
  deleteList(id: string): Promise<boolean>;
  
  // Item operations
  getItemById(itemId: string): Promise<IItem | null>;
  addItem(listId: string, order: number, content: string): Promise<IList>;
  updateItem(itemId: string, order?: number, content?: string, isDone?: boolean): Promise<IList | null>;
  deleteItem(itemId: string): Promise<boolean>;
  
  // ACL operations
  addUserToList(listId: string, userId: string): Promise<IList>;
  getInvitedLists(userId: string): Promise<IList[]>;
  removeUserFromList(listId: string, userId: string): Promise<IList>;
}

// Store the engine here ig...
let engine: IDbEngine;

function getDbEngine(): IDbEngine {
  if (!engine){
    switch (process.env.DB_TYPE) {
    case 'mongo':
      engine = new MongoDBEngine();
      break;
    case 'postgres':
      engine = new PostgreDBEngine();
      break;
    default:
      throw new Error(`Unsupported database type: ${process.env.DB_TYPE}`);
    }

    engine.connect(); 
  }
  return engine;
}

export default getDbEngine;