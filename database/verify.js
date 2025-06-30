const { DataTypes, Model } = require("sequelize");
const sequelize = require("../lib/connection-db");

class Verify extends Model {};

Verify.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    code: { 
        type: DataTypes.STRING(6), 
        allowNull: false 
    },
    expired_time: { 
        type: DataTypes.DATE, 
    },
}, {
    sequelize,
    modelName: "verifies",
});

module.exports = {
    Verify,
}