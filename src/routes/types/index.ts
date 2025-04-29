import { Response, Request } from "express";
import { IUser } from "@src/models/User";

type TRecord = Record<string, unknown>;
export type IReq = Request<TRecord, void, TRecord, TRecord>;
export type IRes = Response<unknown, TRecord>;

declare module "express-session" {
  interface SessionData {
    user: IUser;
  }
}
