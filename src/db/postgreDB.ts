import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { IDbEngine } from './dbEngine';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';

export default class PostgreDBEngine implements IDbEngine {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  getPool(): Pool {
    return this.pool;
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
      [_id, name, bcrypt],
    );
    return res.rows[0];
  }

  async getUserById(id: string): Promise<IUser | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE _id = $1', [
      id,
    ]);
    return res.rows[0] || null;
  }

  async getUserByName(name: string): Promise<IUser | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE name = $1', [
      name,
    ]);
    return res.rows[0] || null;
  }

  async getListsByUserId(userId: string): Promise<IList[]> {
    try {
      const listRes = await this.pool.query(
        'SELECT * FROM lists WHERE owner = $1',
        [userId],
      );
      const lists: IList[] = [];

      for (const row of listRes.rows) {
        const itemsRes = await this.pool.query(
          'SELECT * FROM items WHERE listId = $1',
          [row._id],
        );
        const aclRes = await this.pool.query(
          'SELECT userId FROM acl WHERE listId = $1',
          [row._id],
        );

        lists.push({
          _id: row._id,
          name: row.name,
          owner: row.owner,
          items: itemsRes.rows.map((item) => ({
            _id: item._id,
            order: item.order,
            content: item.content,
            isDone: item.isDone,
          })),
          invitedUsers: aclRes.rows.map((acl) => acl.userId),
        });
      }

      return lists;
    } catch (error) {
      console.error(`Error fetching lists for user ID ${userId}: ${error}`);
      return [];
    }
  }

  async updateUser(
    userId: string,
    name?: string,
    bcrypt?: string,
  ): Promise<IUser | null> {
    const updates: string[] = [];
    const values: (string | undefined)[] = [userId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (bcrypt !== undefined) {
      updates.push(`bcrypt = $${paramIndex}`);
      values.push(bcrypt);
      paramIndex++;
    }

    if (updates.length === 0) {
      return await this.getUserById(userId);
    }

    try {
      const query = `UPDATE users SET ${updates.join(
        ', ',
      )} WHERE _id = $1 RETURNING _id, name, bcrypt`;
      const res = await this.pool.query(query, values);
      if (!res.rows[0]) {
        console.error(`No user found with ID ${userId} for update`);
        return null;
      }

      return {
        _id: res.rows[0]._id,
        name: res.rows[0].name,
        bcrypt: res.rows[0].bcrypt,
      };
    } catch (error) {
      console.error(`Error updating user with ID ${userId}: ${error}`);
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM users WHERE _id = $1 RETURNING _id',
      [userId],
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  async createList(name: string, owner: string): Promise<IList> {
    const _id = uuidv4();
    const res = await this.pool.query(
      'INSERT INTO lists (_id, name, owner) VALUES ($1, $2, $3) RETURNING *',
      [_id, name, owner],
    );
    return { ...res.rows[0], items: [], invitedUsers: [] };
  }

  async getListById(id: string): Promise<IList | null> {
    try {
      const listRes = await this.pool.query(
        'SELECT * FROM lists WHERE _id = $1',
        [id],
      );
      if (!listRes.rows[0]) {
        console.error(`List with ID ${id} not found`);
        return null;
      }

      const itemsRes = await this.pool.query(
        'SELECT * FROM items WHERE listId = $1',
        [id],
      );
      const aclRes = await this.pool.query(
        'SELECT userId FROM acl WHERE listId = $1',
        [id],
      );

      return {
        _id: listRes.rows[0]._id,
        name: listRes.rows[0].name,
        owner: listRes.rows[0].owner,
        items: itemsRes.rows.map((row) => ({
          _id: row._id,
          order: row.order,
          content: row.content,
          isDone: row.isDone,
        })),
        invitedUsers: aclRes.rows.map((row) => row.userId),
      };
    } catch (error) {
      console.error(`Error fetching list by ID ${id}: ${error}`);
      return null;
    }
  }

  async getListByItemId(itemId: string): Promise<IList | null> {
    try {
      const itemRes = await this.pool.query(
        'SELECT listId FROM items WHERE _id = $1',
        [itemId],
      );
      if (!itemRes.rows[0]) {
        console.error(`No item found with ID ${itemId}`);
        return null;
      }
      const listId = itemRes.rows[0].listId;

      return await this.getListById(listId);
    } catch (error) {
      console.error(`Error fetching list by item ID ${itemId}: ${error}`);
      return null;
    }
  }

  async updateList(
    listId: string,
    name?: string,
    owner?: string,
  ): Promise<IList | null> {
    const updates: string[] = [];
    const values: (string | undefined)[] = [listId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (owner !== undefined) {
      updates.push(`owner = $${paramIndex}`);
      values.push(owner);
      paramIndex++;
    }

    if (updates.length === 0) {
      return await this.getListById(listId);
    }

    try {
      const query = `UPDATE lists SET ${updates.join(
        ', ',
      )} WHERE _id = $1 RETURNING _id, name, owner`;
      const res = await this.pool.query(query, values);
      if (!res.rows[0]) {
        console.error(`No list found with ID ${listId} for update`);
        return null;
      }

      const itemsRes = await this.pool.query(
        'SELECT * FROM items WHERE listId = $1',
        [listId],
      );
      const aclRes = await this.pool.query(
        'SELECT userId FROM acl WHERE listId = $1',
        [listId],
      );

      return {
        _id: res.rows[0]._id,
        name: res.rows[0].name,
        owner: res.rows[0].owner,
        items: itemsRes.rows.map((row) => ({
          _id: row._id,
          order: row.order,
          content: row.content,
          isDone: row.isDone,
        })),
        invitedUsers: aclRes.rows.map((row) => row.userId),
      };
    } catch (error) {
      console.error(`Error updating list with ID ${listId}: ${error}`);
      return null;
    }
  }

  async deleteList(id: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM lists WHERE _id = $1 RETURNING _id',
      [id],
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  async getItemById(itemId: string): Promise<IItem | null> {
    const res = await this.pool.query(
      'SELECT _id, "order", content, isDone FROM items WHERE _id = $1',
      [itemId],
    );
    if (!res.rows[0]) {
      console.error(`No item found with ID ${itemId}`);
      return null;
    }
    return {
      _id: res.rows[0]._id,
      order: res.rows[0].order,
      content: res.rows[0].content,
      isDone: res.rows[0].isDone,
    };
  }

  async addItem(
    listId: string,
    order: number,
    content: string,
  ): Promise<IList> {
    await this.pool.query(
      'INSERT INTO items (_id, listId, "order", content, isDone) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), listId, order, content, false],
    );
    return (await this.getListById(listId))!;
  }

  async updateItem(
    itemId: string,
    order?: number,
    content?: string,
    isDone?: boolean,
  ): Promise<IList | null> {
    const updates: string[] = [];
    const values: (string | number | boolean | undefined)[] = [itemId];
    let paramIndex = 2;

    if (order !== undefined) {
      updates.push(`"order" = $${paramIndex}`);
      values.push(order);
      paramIndex++;
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }
    if (isDone !== undefined) {
      updates.push(`isDone = $${paramIndex}`);
      values.push(isDone);
      paramIndex++;
    }

    if (updates.length === 0) {
      const item = await this.getItemById(itemId);
      if (!item) {
        console.error(`No item found with ID ${itemId}`);
        return null;
      }
      const list = await this.getListById(
        (
          await this.pool.query('SELECT listId FROM items WHERE _id = $1', [
            itemId,
          ])
        ).rows[0]?.listId,
      );
      if (!list) {
        console.error(
          `Orphaned item id: ${itemId} has not been found... Your database is fucked, this state should never happen. Please fix your DB manually.`,
        );
        return null;
      }
      return list;
    }

    try {
      const query = `UPDATE items SET ${updates.join(
        ', ',
      )} WHERE _id = $1 RETURNING listId`;
      const res = await this.pool.query(query, values);
      if (!res.rows[0]) {
        console.error(`No item found with ID ${itemId} for update`);
        return null;
      }

      return await this.getListById(res.rows[0].listId);
    } catch (error) {
      console.error(`Error updating item with ID ${itemId}: ${error}`);
      return null;
    }
  }

  async deleteItem(itemId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM items WHERE _id = $1 RETURNING listId',
      [itemId],
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  async addUserToList(listId: string, userId: string): Promise<IList> {
    await this.pool.query('INSERT INTO acl (listId, userId) VALUES ($1, $2)', [
      listId,
      userId,
    ]);
    return (await this.getListById(listId))!;
  }

  async getInvitedLists(userId: string): Promise<IList[]> {
    try {
      const aclRes = await this.pool.query(
        'SELECT listId FROM acl WHERE userId = $1',
        [userId],
      );
      const lists: IList[] = [];

      for (const row of aclRes.rows) {
        const list = await this.getListById(row.listId);
        if (list) {
          lists.push(list);
        }
      }

      return lists;
    } catch (error) {
      console.error(
        `Error fetching invited lists for user ID ${userId}: ${error}`,
      );
      return [];
    }
  }

  async removeUserFromList(listId: string, userId: string): Promise<IList> {
    await this.pool.query('DELETE FROM acl WHERE listId = $1 AND userId = $2', [
      listId,
      userId,
    ]);
    return (await this.getListById(listId))!;
  }
}
