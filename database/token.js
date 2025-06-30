const { DataTypes, Model } = require('sequelize');
const sequelize = require('../lib/connection-db');

class Token extends Model {};

Token.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    amount: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    is_added: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    }
}, {
    modelName: 'tokens',
    timestamps: true,
    sequelize,
})

class RuleToken extends Model {};

RuleToken.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    amount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
    },
    character: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }
}, {
    modelName: 'rule_tokens',
    timestamps: true,
    sequelize,
})

exports = {
    Token,
    RuleToken,
}