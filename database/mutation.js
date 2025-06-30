const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Mutation extends Model {};

Mutation.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    reff_id: {
        type: DataTypes.STRING,
        unique: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'vouchers',
            key: 'id',
        }
    },
    package_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'packages',
            key: 'id',
        }
    },
    amount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    price_total: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false,
    },
    fee: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'gagal', 'sukses'),
        allowNull: false,
        defaultValue: 'pending',
    },
}, {
    modelName: 'mutations',
    timestamps: true,
    sequelize,
})

module.exports = {
    Mutation,
}