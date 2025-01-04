const fs = require('fs');
const path = require('path');

const addSchedule = (id, activity, date, time) => {
	const obj = {id, activity, date, time}
    schedule.push(obj)
    fs.writeFileSync(path.join(process.cwd(), 'database/schedule.json'), JSON.stringify(schedule))
}

const addUser = (sender, username, message) => {
    const obj = {sender, username, message}
    user.push(obj)
    fs.writeFileSync(path.join(process.cwd(), 'database/user.json'), JSON.stringify(user))
}

const findOneUser = (query, key = 'sender') => {
    return user.find(usr => usr[key] == query);
}

const findAllUser = (query, key = 'sender') => {
    return user.filter(usr => usr[key] == query);
}

module.exports = {
    addSchedule,
    addUser,
    findOneUser,
    findAllUser
}