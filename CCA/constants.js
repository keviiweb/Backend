import "dotenv/config";

/**
 * Config table setup. This is where all the table names for
 * the SQL database can be found.
 */
export const config = {
    TABLE_USER_LIST: process.env.TABLE_USER_LIST,
    TABLE_USER_CCA_RECORD: process.env.TABLE_USER_CCA_RECORD,
    TABLE_CCA_LIST: process.env.TABLE_CCA_LIST,
    TABLE_CCA_SESSIONS: process.env.TABLE_CCA_SESSIONS,
    TABLE_CCA_CATEGORY: process.env.TABLE_CCA_CATEGORY,
    TABLE_CCA_SESSION_ATTENDANCE: process.env.TABLE_CCA_SESSION_ATTENDANCE,
    TABLE_ANNOUCEMENTS: process.env.TABLE_ANNOUCEMENTS,
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    DATABASE_PORT:process.env.DATABASE_PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    SQL_ROW_LIMIT: process.env.SQL_ROW_LIMIT,
    NODE_PORT: process.env.NODE_PORT
  };