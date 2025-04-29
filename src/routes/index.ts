import { Router } from 'express';

import UserRoutes from './UserRoutes';
import ListRoutes from './ListRoutes';
import ItemRoutes from './ItemRoutes';

// /api/v1
const apiRouter = Router();

const listRouter = Router();
listRouter.get('/:listId', ListRoutes.get);
listRouter.patch('/:listId', ListRoutes.patch);
listRouter.delete('/:listId', ListRoutes.delete);
listRouter.post('/create', ListRoutes.create);

const itemsRouter = Router();
itemsRouter.get('/:itemId', ItemRoutes.get);
itemsRouter.post('/create', ItemRoutes.create);
itemsRouter.patch('/:itemId', ItemRoutes.patch);
itemsRouter.delete('/:itemId', ItemRoutes.delete);

// UserRouter
const userRouter = Router();

userRouter.get('/me', UserRoutes.me);
//userRouter.get('/query', UserRoutes.query);
userRouter.patch('/update', UserRoutes.update);
userRouter.delete('/delete', UserRoutes.delete);

// BindRouters
apiRouter.use('/user', userRouter);
apiRouter.use('/list', listRouter);
apiRouter.use('/items', itemsRouter);

export default apiRouter;
