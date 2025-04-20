import jetEnv, { num } from 'jet-env';
import { isEnumVal } from 'jet-validators';

import { NodeEnvs, DbType } from '.';


/******************************************************************************
                                 Setup
******************************************************************************/

const ENV = jetEnv({
  NodeEnv: isEnumVal(NodeEnvs),
  Port: num,
  SessionSecret: String,
  DbType: isEnumVal(DbType),
  DbHost: String,
  DbPort: num,
  DbName: String,
  DbUser: String,
  DbPassword: String,
});


/******************************************************************************
                            Export default
******************************************************************************/

export default ENV;
