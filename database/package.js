const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Package extends Model {};

Package.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false,
    },
    price: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
    },
    description: {
        type: DataTypes.TEXT('long'),
    }
}, {
    modelName: 'packages',
    timestamps: true,
    sequelize,
})

module.exports = {
    Package,
}