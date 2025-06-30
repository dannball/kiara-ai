const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Voucher extends Model {};

Voucher.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    date: {
        type: DataTypes.DATE,
    },
    max_claim: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    discount: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM("package", "token"),
        allowNull: false,
    }
}, {
    modelName: 'vouchers',
    timestamps: true,
    sequelize,
});

class UserVoucher extends Model {};

UserVoucher.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    voucher_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'vouchers',
            key: 'id',
        }
    }
}, {
    modelName: 'user_vouchers',
    timestamps: true,
    sequelize,
})

module.exports = {
    Voucher,
    UserVoucher,
}