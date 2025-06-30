const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class User extends Model {};

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'dev'),
        allowNull: false,
        defaultValue: 'user'
    },
    sender: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'users',
})

module.exports = User;