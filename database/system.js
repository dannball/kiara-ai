const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class System extends Model {};

System.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    botNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    pairCode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "",
    },
    status: {
        type: DataTypes.ENUM("berak", "turu", "siap", "ban"),
        allowNull: false,
        defaultValue: "turu",
    },
}, {
    sequelize,
    modelName: 'systems',
})

module.exports = System;