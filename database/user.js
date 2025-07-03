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
        allowNull: false,
        unique: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
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
    is_verify: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    sender: {
        type: DataTypes.STRING,
    },
}, {
    sequelize,
    modelName: 'users',
})

module.exports = User;