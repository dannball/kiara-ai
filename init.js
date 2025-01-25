require('dotenv/config');

const Database = require('./database');
const connection = require('./lib/connection');

connection.sync({ alter: true });
connection.addHook('afterBulkSync', async () => {
    const { PROJECT_NAME, BOT_NUMBER } = process.env;
    let data = await Database.System.create({ id: 1, name: PROJECT_NAME, botNumber: BOT_NUMBER }, { ignoreDuplicates: true });
    if (!data.isNewRecord) await Database.System.update({ name: PROJECT_NAME, botNumber: BOT_NUMBER }, { where: { id: 1 } });
})
