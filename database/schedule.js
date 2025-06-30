const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Schedule extends Model {};

Schedule.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    activity: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
    },
    response_ai: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
    },
    is_reminded: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    system_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'systems',
            key: 'id',
        }
    },
}, {
    sequelize,
    modelName: 'schedules',
    timestamps: true,
})

module.exports = Schedule;