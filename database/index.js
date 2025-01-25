const System = require('./system');
const Session = require('./session');
const User = require('./user');
const Schedule = require('./schedule');

System.hasMany(Session, { foreignKey: 'system_id', onDelete: 'CASCADE' });
Session.belongsTo(System, { foreignKey: 'system_id', onDelete: 'CASCADE' });

User.hasMany(Schedule, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Schedule.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

System.hasMany(Schedule, { foreignKey: 'system_id', onDelete: 'CASCADE' });
Schedule.belongsTo(System, { foreignKey: 'system_id', onDelete: 'CASCADE' });

module.exports = {
    System,
    Session,
    User,
    Schedule,
}