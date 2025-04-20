 
import morgan from 'morgan';
//import path from 'path';
import helmet from 'helmet';
import express, { Request, Response, NextFunction, Router } from 'express';
import logger from 'jet-logger';
import session from 'express-session';

import 'express-async-errors';

import BaseRouter from '@src/routes';
import AuthRoutes from './routes/AuthRoutes';

import Paths from '@src/constants/Paths';
import ENV from '@src/constants/ENV';
import HttpStatusCodes from '@src/constants/HttpStatusCodes';
import { RouteError } from '@src/util/route-errors';
import { NodeEnvs } from '@src/constants';

/******************************************************************************
                                Setup
******************************************************************************/

const app = express();

// **** Middleware **** //

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Session middleware
// TODO: Setup session persistence
app.use(
  session({
    secret: ENV.SessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: ENV.NodeEnv === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // One week
      sameSite: 'strict',
    },
  }),
);

// Show routes called in console during development
if (ENV.NodeEnv === NodeEnvs.Dev) {
  app.use(morgan('dev'));
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(JSON.stringify(req.body));
    next();
  });
}

// Security
if (ENV.NodeEnv === NodeEnvs.Production) {
  // eslint-disable-next-line n/no-process-env
  if (!process.env.DISABLE_HELMET) {
    app.use(helmet());
  }
}

// Quick and dirty auth implementation
// TODO: Refactor this somehow...
const authRouter = Router();
authRouter.post(Paths.Auth.Login, AuthRoutes.login);
authRouter.post(Paths.Auth.Register, AuthRoutes.register);
app.use(Paths.Base + Paths.Auth.Base, authRouter);

// Simple middleware implementation for requiring auth for following routes
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  return next();
}

// Add APIs, must be after middleware
app.use(Paths.Base, requireAuth, BaseRouter);

// Add error handler
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  if (ENV.NodeEnv !== NodeEnvs.Test.valueOf()) {
    logger.err(err, true);
  }
  let status = HttpStatusCodes.BAD_REQUEST;
  if (err instanceof RouteError) {
    status = err.status;
    res.status(status).json({ error: err.message });
  }
  return next(err);
});

// Set static directory (js and css).
//const staticDir = path.join(__dirname, 'public');
//app.use(express.static(staticDir));

/******************************************************************************
                                Export default
******************************************************************************/

export default app;
