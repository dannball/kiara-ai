const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Chat extends Model {};

Chat.init({
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
    },
    system_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'systems',
            key: 'id',
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    content: {
        type: DataTypes.TEXT('long'),
    },
    role: {
        type: DataTypes.ENUM('assistant', 'user'),
        defaultValue: 'user',
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    modelName: 'chats',
})

module.exports = {Chat};