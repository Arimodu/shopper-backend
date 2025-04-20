import { Router } from 'express';

import Paths from '@src/constants/Paths';
import UserRoutes from './UserRoutes';
import ListRoutes from './ListRoutes';
import ItemRoutes from './ItemRoutes';


/******************************************************************************
                                Setup
******************************************************************************/

// Base router
const apiRouter = Router();

// List Router
const listRouter = Router();

listRouter.get(Paths.List.Id, ListRoutes.get);
listRouter.patch(Paths.List.Id, ListRoutes.patch);
listRouter.delete(Paths.List.Id, ListRoutes.delete);
listRouter.post(Paths.List.Create, ListRoutes.create);

// Items Router
const itemsRouter = Router();

//itemsRouter.get(Paths.Items.Id, );
itemsRouter.post(Paths.Items.Create, ItemRoutes.create);
itemsRouter.patch(Paths.Items.Id, ItemRoutes.patch);
itemsRouter.delete(Paths.Items.Id, ItemRoutes.delete);

// UserRouter
const userRouter = Router();

//userRouter.get(Paths.Users.Get, UserRoutes.getAll);
userRouter.patch(Paths.Users.Update, UserRoutes.update);
userRouter.delete(Paths.Users.Delete, UserRoutes.delete);

// BindRouters
apiRouter.use(Paths.Users.Base, userRouter);
apiRouter.use(Paths.List.Base, listRouter);
apiRouter.use(Paths.Items.Base, itemsRouter);



/******************************************************************************
                                Export default
******************************************************************************/

export default apiRouter;
