import morgan from 'morgan';
import express, { Request, Response, NextFunction, Router } from 'express';
import session, { SessionOptions } from 'express-session';
import dotenv from 'dotenv';
import connectPgSimple from 'connect-pg-simple';

import BaseRouter from '@src/routes';
import AuthRoutes from './routes/AuthRoutes';
import { CipherKey } from 'crypto';
import getDbEngine from './db/dbEngine';
import PostgreDBEngine from './db/postgreDB';

dotenv.config();
const pgSession = connectPgSimple(session);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Session middleware
const sess: SessionOptions = {
  secret: process.env.SESSION_SECRET as CipherKey,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'prod',
    maxAge: 1000 * 60 * 60 * 24 * 7, // One week
    sameSite: 'strict',
  },
};

if (process.env.DB_TYPE === 'postgres') {
  const engine = getDbEngine() as PostgreDBEngine;
  const pool = engine.getPool();
  sess.store = new pgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  });
}

app.use(session(sess));

if (process.env.NODE_ENV === 'dev') {
  app.use(morgan('dev'));
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(JSON.stringify(req.body));
    next();
  });
}

// Quick and dirty auth implementation
// TODO: Refactor this somehow...
// Screw refactoring, we doin an iPixelGalaxy move
const authRouter = Router();
authRouter.post('/login', AuthRoutes.login);
authRouter.post('/register', AuthRoutes.register);
app.use('/api/v1/auth', authRouter);

// Simple middleware implementation for requiring auth for following routes
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  return next();
}

app.use('/api/v1', requireAuth, BaseRouter);

app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err });
  return next(err);
});

app.listen(process.env.PORT, () =>
  console.log(`Express server started on port: ${process.env.PORT}`),
);
