/* eslint-disable max-len */
import { Sequelize, DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import ENV from '@src/constants/ENV';
import { IDbEngine } from './dbEngine';
import { IUser } from '@src/models/User';
import { IItem } from '@src/models/Item';
import { IList } from '@src/models/List';
import logger from 'jet-logger';

/******************************************************************************
                                 Models
******************************************************************************/

/**
 * We have to extend the IItem interface like this for postgres forein key to work
 */
interface pgIItem extends IItem {
    listId: string;
}

class User extends Model<IUser> {
  public _id!: string;
  public name!: string;
  public bcrypt!: string;
}

class List extends Model<Omit<Omit<IList, 'invitedUsers'>, 'items'>> {
  public _id!: string;
  public name!: string;
  public owner!: string;
  public items!: IItem[];
}

class Item extends Model<pgIItem> {
  public _id!: string;
  public listId!: string;
  public order!: number;
  public content!: string;
  public isDone!: boolean;
}

class ACL extends Model {
  public listId!: string;
  public userId!: string;
}

/******************************************************************************
                                 Implementation
******************************************************************************/

export default class PostgreDBEngine implements IDbEngine {
  private sequelize: Sequelize;

  public constructor() {
    this.sequelize = new Sequelize({
      dialect: 'postgres',
      host: ENV.DbHost,
      port: ENV.DbPort,
      database: ENV.DbName,
      username: ENV.DbUser,
      password: ENV.DbPassword,
      logging: (p) => logger.info(p),
    });
  }

  public async connect(): Promise<void> {
    User.init({
      _id: { type: DataTypes.UUID, primaryKey: true, defaultValue: uuidv4 },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      bcrypt: { type: DataTypes.STRING, allowNull: false },
    }, { sequelize: this.sequelize, modelName: 'User', timestamps: false });

    List.init({
      _id: { type: DataTypes.UUID, primaryKey: true, defaultValue: uuidv4 },
      name: { type: DataTypes.STRING, allowNull: false },
      owner: { type: DataTypes.UUID, allowNull: false },
    }, { sequelize: this.sequelize, modelName: 'List', timestamps: false });

    Item.init({
      _id: { type: DataTypes.UUID, primaryKey: true, defaultValue: uuidv4 },
      listId: { type: DataTypes.UUID, allowNull: false },
      order: { type: DataTypes.INTEGER, allowNull: false },
      content: { type: DataTypes.STRING, allowNull: false },
      isDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    }, { sequelize: this.sequelize, modelName: 'Item', timestamps: false });

    ACL.init({
      listId: { type: DataTypes.UUID, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: false },
    }, { sequelize: this.sequelize, modelName: 'ACL', timestamps: false });

    User.hasMany(List, { foreignKey: 'owner' });
    List.belongsTo(User, { foreignKey: 'owner', onDelete: 'CASCADE' }); // Cascadingly delete lists when owner is deleted
    List.hasMany(Item, { foreignKey: 'listId', onDelete: 'CASCADE', as: 'items' }); // Cascadingly delete items when list is deleted
    Item.belongsTo(List, { foreignKey: 'listId' });
    List.belongsToMany(User, { through: ACL, foreignKey: 'listId', otherKey: 'userId', onDelete: 'CASCADE' }); // Cascadingly delete ACL records on list removal
    User.belongsToMany(List, { through: ACL, foreignKey: 'userId', otherKey: 'listId', onDelete: 'CASCADE' }); // Cascadingly delete ACL records on user removal

    await this.sequelize.sync();
  }

  public async disconnect(): Promise<void> {
    await this.sequelize.close();
  }

  public async createUser(name: string, bcrypt: string): Promise<IUser> {
    return (await User.create({ _id: uuidv4(), name, bcrypt })) as IUser;
  }

  public async getUserById(id: string): Promise<IUser | null> {
    return await User.findByPk(id);
  }

  public async getUserByName(name: string): Promise<IUser | null> {
    return await User.findOne({ where: { name } });
  }

  public async createList(name: string, owner: string): Promise<IList> {
    const data = await List.create({ _id: uuidv4(), name, owner });
    return data as unknown as IList;
  }

  public async getListById(id: string): Promise<IList | null> {
    try {
      const list = await List.findByPk(id, {
        include: [
          { model: Item, as: 'items' },
        ],
      });
  
      if (!list) {
        logger.err(`List with ID ${id} not found`);
        return null;
      }

      const aclEntries = await ACL.findAll({
        where: { listId: id },
      });
      const invitedUsers = aclEntries.map((acl) => acl.userId);
      
      const result: IList = {
        _id: list._id,
        name: list.name,
        owner: list.owner,
        items: list.items ?? [],
        invitedUsers: invitedUsers,
      };
  
      return result;
    } catch (error) {
      logger.err(`Error fetching list by ID ${id}: ${error}`);
      return null;
    }
  }

  public async updateList(list: IList): Promise<IList> {
    await List.update(list, { where: { _id: list._id } });
    return (await this.getListById(list._id))!;
  }

  public async deleteList(id: string): Promise<void> {
    await List.destroy({ where: { _id: id } });
  }

  public async addItem(listId: string, order: number, content: string): Promise<IList> {
    await Item.create({_id: uuidv4(), listId, order, content, isDone: false });
    return (await this.getListById(listId))!;
  }

  public async updateItem(listId: string, item: IItem): Promise<IList> {
    logger.imp(JSON.stringify(item));
    await Item.update({ order: item.order, content: item.content, isDone: item.isDone }, { where: { _id: item._id }});
    return (await this.getListById(listId))!;
  }

  public async deleteItem(listId: string, itemId: string): Promise<IList> {
    await Item.destroy({ where: { _id: itemId } });
    return (await this.getListById(listId))!;
  }

  public async addUserToList(listId: string, userId: string): Promise<IList> {
    await ACL.create({ listId, userId });
    return (await this.getListById(listId))!;
  }

  public async removeUserFromList(listId: string, userId: string): Promise<IList> {
    await ACL.destroy({ where: { listId, userId } });
    return (await this.getListById(listId))!;
  }
}