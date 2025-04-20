/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable max-len */
import mongoose, { Schema, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import ENV from '@src/constants/ENV';
import { IDbEngine } from './dbEngine';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';

/******************************************************************************
                                 Schemas
******************************************************************************/

const ItemSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  order: { type: Number, required: true },
  content: { type: String, required: true },
  isDone: { type: Boolean, required: true, default: false },
});

const UserSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  bcrypt: { type: String, required: true },
});

const ListSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  owner: { type: String, ref: 'User', required: true },
  invitedUsers: [{ type: String, ref: 'User' }],
  items: [ItemSchema],
});

const User = model('User', UserSchema);
const List = model('List', ListSchema);

/******************************************************************************
                                 Implementation
******************************************************************************/

export default class MongoDBEngine implements IDbEngine {
  public async connect(): Promise<void> {
    const url = `mongodb://${ENV.DbUser}:${ENV.DbPassword}@${ENV.DbHost}:${ENV.DbPort}/${ENV.DbName}`;
    await mongoose.connect(url);
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }

  public async createUser(name: string, bcrypt: string): Promise<IUser> {
    return await User.create({ _id: uuidv4(), name, bcrypt });
  }

  public async getUserById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  public async getUserByName(name: string): Promise<IUser | null> {
    return await User.findOne({ name });
  }

  public async createList(name: string, owner: string): Promise<IList> {
    return (await List.create({ _id: uuidv4(), name, owner, items: [], invitedUsers: [] })) as unknown as IList;
  }

  public async getListById(id: string): Promise<IList | null> {
    return await List.findById(id);
  }

  public async updateList(list: IList): Promise<IList> {
    return (await List.findByIdAndUpdate(list._id, list, { new: true }))!;
  }

  public async deleteList(id: string): Promise<void> {
    await List.findByIdAndDelete(id);
  }

  public async addItem(listId: string, order: number, content: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $push: { items: { order, content } } }, // This is why Mongodb SUCKSSSSSS!!! Why modify a whole list when adding an item
      { new: true },
    ))!;
  }

  public async updateItem(listId: string, item: IItem): Promise<IList> {
    return (await List.findOneAndUpdate(
      { _id: listId, 'items._id': item._id },
      { $set: { 'items.$': item } },
      { new: true },
    ))!;
  }

  public async deleteItem(listId: string, itemId: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $pull: { items: { _id: itemId } } },
      { new: true },
    ))!;
  }

  public async addUserToList(listId: string, userId: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $addToSet: { invitedUsers: userId } },
      { new: true },
    ))!;
  }

  public async removeUserFromList(listId: string, userId: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $pull: { invitedUsers: userId } },
      { new: true },
    ))!;
  }
}