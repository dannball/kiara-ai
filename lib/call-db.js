const { readFileSync, accessSync, writeFileSync } = require('fs');
const { join } = require('path');

// allocated file from path file
const userPath = join(process.cwd(), 'database/user.json');
const schedulePath = join(process.cwd(), 'database/schedule.json');

// trying to accessed file if not available write this file;
try { accessSync(schedulePath); } catch (error) { writeFileSync(schedulePath, JSON.stringify([])); }
try { accessSync(userPath); } catch (error) { writeFileSync(userPath, JSON.stringify([])); }

// caching the data to global;
global.user = JSON.parse(readFileSync(userPath));
global.schedule = JSON.parse(readFileSync(schedulePath));