const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection');
class Session extends Model {};

Session.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    value: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    system_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            key: 'id',
            model: 'systems',
        }
    },
}, {
    sequelize,
    modelName: 'sessions',
    indexes: [
        {
            unique: true,
            fields: ['key', 'system_id']
        }
    ]
});

module.exports = Session;