import { Pool, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import ENV from '@src/constants/ENV';
import { IDbEngine } from './dbEngine';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';
import logger from 'jet-logger';

export default class PostgreDBEngine implements IDbEngine {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: ENV.DbHost,
      port: ENV.DbPort,
      database: ENV.DbName,
      user: ENV.DbUser,
      password: ENV.DbPassword,
    });
  }

  async connect(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        _id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        bcrypt VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lists (
        _id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner UUID NOT NULL REFERENCES users(_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS items (
        _id UUID PRIMARY KEY,
        listId UUID NOT NULL REFERENCES lists(_id) ON DELETE CASCADE,
        "order" INTEGER NOT NULL,
        content VARCHAR(255) NOT NULL,
        isDone BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS acl (
        listId UUID NOT NULL REFERENCES lists(_id) ON DELETE CASCADE,
        userId UUID NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
        PRIMARY KEY (listId, userId)
      );
    `);
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async createUser(name: string, bcrypt: string): Promise<IUser> {
    const _id = uuidv4();
    const res = await this.pool.query(
      'INSERT INTO users (_id, name, bcrypt) VALUES ($1, $2, $3) RETURNING *',
      [_id, name, bcrypt]
    );
    return res.rows[0];
  }

  async getUserById(id: string): Promise<IUser | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE _id = $1', [id]);
    return res.rows[0] || null;
  }

  async getUserByName(name: string): Promise<IUser | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE name = $1', [name]);
    return res.rows[0] || null;
  }

  async createList(name: string, owner: string): Promise<IList> {
    const _id = uuidv4();
    const res = await this.pool.query(
      'INSERT INTO lists (_id, name, owner) VALUES ($1, $2, $3) RETURNING *',
      [_id, name, owner]
    );
    return { ...res.rows[0], items: [], invitedUsers: [] };
  }

  async getListById(id: string): Promise<IList | null> {
    try {
      const listRes = await this.pool.query('SELECT * FROM lists WHERE _id = $1', [id]);
      if (!listRes.rows[0]) {
        logger.err(`List with ID ${id} not found`);
        return null;
      }

      const itemsRes = await this.pool.query('SELECT * FROM items WHERE listId = $1', [id]);
      const aclRes = await this.pool.query('SELECT userId FROM acl WHERE listId = $1', [id]);

      return {
        _id: listRes.rows[0]._id,
        name: listRes.rows[0].name,
        owner: listRes.rows[0].owner,
        items: itemsRes.rows,
        invitedUsers: aclRes.rows.map((row) => row.userId),
      };
    } catch (error) {
      logger.err(`Error fetching list by ID ${id}: ${error}`);
      return null;
    }
  }

  async updateList(list: IList): Promise<IList> {
    await this.pool.query(
      'UPDATE lists SET name = $1, owner = $2 WHERE _id = $3',
      [list.name, list.owner, list._id]
    );
    return (await this.getListById(list._id))!;
  }

  async deleteList(id: string): Promise<void> {
    await this.pool.query('DELETE FROM lists WHERE _id = $1', [id]);
  }

  async addItem(listId: string, order: number, content: string): Promise<IList> {
    await this.pool.query(
      'INSERT INTO items (_id, listId, "order", content, isDone) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), listId, order, content, false]
    );
    return (await this.getListById(listId))!;
  }

  async updateItem(listId: string, item: IItem): Promise<IList> {
    await this.pool.query(
      'UPDATE items SET "order" = $1, content = $2, isDone = $3 WHERE _id = $4',
      [item.order, item.content, item.isDone, item._id]
    );
    return (await this.getListById(listId))!;
  }

  async deleteItem(listId: string, itemId: string): Promise<IList> {
    await this.pool.query('DELETE FROM items WHERE _id = $1', [itemId]);
    return (await this.getListById(listId))!;
  }

  async addUserToList(listId: string, userId: string): Promise<IList> {
    await this.pool.query('INSERT INTO acl (listId, userId) VALUES ($1, $2)', [listId, userId]);
    return (await this.getListById(listId))!;
  }

  async removeUserFromList(listId: string, userId: string): Promise<IList> {
    await this.pool.query('DELETE FROM acl WHERE listId = $1 AND userId = $2', [listId, userId]);
    return (await this.getListById(listId))!;
  }
}