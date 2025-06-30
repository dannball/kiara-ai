require('dotenv').config();

module.exports = {
  development: {
    username: process.env.USERNAME_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DB_NAME,
    host: "127.0.0.1",
    dialect: "mysql"
  },
  test: {
    username: process.env.USERNAME_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DB_NAME,
    host: "127.0.0.1",
    dialect: "mysql"
  },
  production: {
    username: process.env.USERNAME_DB,
    password: process.env.PASSWORD_DB,
    database: process.env.DB_NAME,
    host: "127.0.0.1",
    dialect: "mysql"
  }
}
