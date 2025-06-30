const System = require('./system');
const Session = require('./session');
const User = require('./user');
const Schedule = require('./schedule');
const { Token, RuleToken } = require('./token');
const { Package } = require('./package');
const { UserVoucher, Voucher } = require('./voucher');
const { Auth } = require('./auth');
const { Verify } = require('./verify');
const { Mutation } = require('./mutation');

System.hasMany(Session, { foreignKey: 'system_id', onDelete: 'CASCADE' });
Session.belongsTo(System, { foreignKey: 'system_id', onDelete: 'CASCADE' });

User.hasMany(Schedule, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Schedule.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

User.hasMany(Mutation, { foreignKey: 'user_id' });
Mutation.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Verify, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Verify.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

User.hasMany(Auth, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Auth.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

System.hasMany(Schedule, { foreignKey: 'system_id', onDelete: 'CASCADE' });
Schedule.belongsTo(System, { foreignKey: 'system_id', onDelete: 'CASCADE' });

User.hasMany(Token, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Token.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

Voucher.hasMany(UserVoucher, { foreignKey: 'voucher_id', onDelete: 'CASCADE' });
UserVoucher.belongsTo(Voucher, { foreignKey: 'voucher_id', onDelete: 'CASCADE' });

Voucher.hasMany(Mutation, { foreignKey: 'voucher_id' });
Mutation.belongsTo(Voucher, { foreignKey: 'voucher_id' });

Package.hasMany(Mutation, { foreignKey: 'package_id' });
Mutation.belongsTo(Package, { foreignKey: 'package_id' });

User.hasMany(UserVoucher, { foreignKey: 'user_id', onDelete: 'CASCADE' })
UserVoucher.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' })

module.exports = {
    Auth,
    User,
    Token,
    Verify,
    System,
    Package,
    Session,
    Voucher,
    Schedule,
    RuleToken,
    UserVoucher,
}