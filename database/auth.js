const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Auth extends Model {};

Auth.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.TEXT('long'),
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    validity_data: {
        type: DataTypes.TEXT('long'),
    },
    expired_time: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false,
    }
}, { 
    modelName: 'auths',
    timestamps: true, 
    sequelize, 
})

module.exports = {
    Auth,
}