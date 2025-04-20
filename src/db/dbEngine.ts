/* eslint-disable @typescript-eslint/restrict-template-expressions */
import ENV from '@src/constants/ENV';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';
import { DbType } from '@src/constants';
import MongoDBEngine from './mongoDB';
import PostgreDBEngine from './postgreDB';

/******************************************************************************
                                 Database Engine Interface
******************************************************************************/

export interface IDbEngine {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // User operations
  createUser(name: string, bcrypt: string): Promise<IUser>;
  getUserById(id: string): Promise<IUser | null>;
  getUserByName(name: string): Promise<IUser | null>;
  
  // List operations
  createList(name: string, owner: string): Promise<IList>;
  getListById(id: string): Promise<IList | null>;
  updateList(list: IList): Promise<IList>;
  deleteList(id: string): Promise<void>;
  
  // Item operations
  addItem(listId: string, order: number, content: string): Promise<IList>;
  updateItem(listId: string, item: IItem): Promise<IList>;
  deleteItem(listId: string, itemId: string): Promise<IList>;
  
  // ACL operations
  addUserToList(listId: string, userId: string): Promise<IList>;
  removeUserFromList(listId: string, userId: string): Promise<IList>;
}

/******************************************************************************
                                 Factory
******************************************************************************/

// Store the engine here ig...
let engine: IDbEngine;

function getDbEngine(): IDbEngine {
  if (!engine){
    switch (ENV.DbType) {
    case DbType.Mongo:
      engine = new MongoDBEngine();
      break;
    case DbType.Postgres:
      engine = new PostgreDBEngine();
      break;
    default:
      throw new Error(`Unsupported database type: ${ENV.DbType}`);
    }

    engine.connect(); 
  }
  return engine;
}

/******************************************************************************
                                 Export
******************************************************************************/

export default getDbEngine;