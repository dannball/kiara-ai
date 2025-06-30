const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
    dialect: "mysql",
    host: 'localhost',
    database: process.env.DB_NAME,
    username: process.env.USERNAME_DB,
    password: process.env.PASSWORD_DB,
    pool: { max: 60, min: 0, acquire: 120000, idle: 10000 },
    dialectOptions: {
        connectTimeout: 60000
    }
})

module.exports = sequelize;