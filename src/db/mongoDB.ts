import mongoose, { Schema, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IDbEngine } from './dbEngine';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';

const ItemSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  order: { type: Number, required: true },
  content: { type: String, required: true },
  isComplete: { type: Boolean, required: true, default: false },
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
  archived: { type: Boolean, required: true, default: false },
  invitedUsers: [{ type: String, ref: 'User' }],
  items: [ItemSchema],
});

const User = model('User', UserSchema);
const List = model('List', ListSchema);

export default class MongoDBEngine implements IDbEngine {
  public async connect(): Promise<void> {
    const url = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
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

  public async updateUser(userId: string, name?: string, bcrypt?: string): Promise<IUser | null> {
    const update: { name?: string, bcrypt?: string } = {};
    if (name) update.name = name;
    if (bcrypt) update.bcrypt = bcrypt;
    return await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
  }

  public async deleteUser(userId: string): Promise<boolean> {
    const result =  await User.findByIdAndDelete(userId);
    return !!result;
  }

  public async createList(name: string, owner: string): Promise<IList> {
    return (await List.create({ _id: uuidv4(), name, owner, items: [], invitedUsers: [] })) as unknown as IList;
  }

  public async getListById(id: string): Promise<IList | null> {
    return await List.findById(id);
  }

  public async updateList(listId: string, name?: string, owner?: string, archived?: boolean): Promise<IList | null> {
    const update: { name?: string, owner?: string, archived?: boolean } = {};
    if (name) update.name = name;
    if (owner) update.owner = owner;
    if (archived != undefined) update.archived = archived;
    return await List.findByIdAndUpdate(listId, { $set: update }, { new: true });
  }

  public async deleteList(id: string): Promise<boolean> {
    const result = await List.findByIdAndDelete(id);
    return !!result;
  }

  public async getItemById(itemId: string): Promise<IItem | null> {
    const list = await List.findOne({ 'items._id': itemId }, { 'items.$': 1 });
    return list?.items[0] ?? null;
  }

  public async getListByItemId(itemId: string): Promise<IList | null> {
    const list = await List.findOne({ 'items._id': itemId });
    if (!list) {
      console.error(`No list found containing item with ID ${itemId}`);
      return null;
    }
    return list;
  }

  public async getListsByUserId(userId: string): Promise<IList[]> {
    return await List.find({ owner: userId }).exec();
  }

  public async addItem(listId: string, order: number, content: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $push: { items: { _id: uuidv4(), order, content, isComplete: false } } },
      { new: true },
    ))!;
  }

  public async updateItem(itemId: string, order?: number, content?: string, isComplete?: boolean): Promise<IList | null> {
    const update: { 'items.$.order'?: number, 'items.$.content'?: string, 'items.$.isComplete'?: boolean } = {};
    if (order) update['items.$.order'] = order;
    if (content) update['items.$.content'] = content;
    if (isComplete !== undefined) update['items.$.isComplete'] = isComplete; // This caused a headache... if (bool) right, yea, thats gonna check if the bool is null, ofc you dumbass
    return await List.findOneAndUpdate(
      { 'items._id': itemId },
      { $set: update },
      { new: true },
    );
  }

  public async deleteItem(itemId: string): Promise<boolean> {
    const result = await List.findOneAndUpdate(
      { 'items._id': itemId },
      { $pull: { items: { _id: itemId } } },
      { new: true },
    );
    return !!result;
  }

  public async addUserToList(listId: string, userId: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $addToSet: { invitedUsers: userId } },
      { new: true },
    ))!;
  }

  public async getInvitedLists(userId: string): Promise<IList[]> {
    return await List.find({ invitedUsers: userId }).exec();
  }

  public async removeUserFromList(listId: string, userId: string): Promise<IList> {
    return (await List.findByIdAndUpdate(
      listId,
      { $pull: { invitedUsers: userId } },
      { new: true },
    ))!;
  }
}