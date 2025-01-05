const fs = require('fs');
const path = require('path');
const { scheduler } = require('timers/promises');

const addSchedule = (id, title, activity, timestamp, sender) => {
	const obj = {id, title, activity, timestamp, sender}
    schedule.push(obj)
    fs.writeFileSync(path.join(process.cwd(), 'database/schedule.json'), JSON.stringify(schedule))
}

const updateTimeSchedule = (id, sender, timestamp) => {
    schedule.forEach((data) => {
        if (data.id == id && data.sender == sender) {
            data.timestamp = timestamp;
        }
    })
    fs.writeFileSync(path.join(process.cwd(), 'database/schedule.json'), JSON.stringify(schedule))
}

const updateActivitySchedule = (id, sender, title, activity) => {
    schedule.forEach((data) => {
        if (data.id == id && data.sender == sender) {
            data.title = title;
            data.activity = activity;
        }
    })
    fs.writeFileSync(path.join(process.cwd(), 'database/schedule.json'), JSON.stringify(schedule))
}

const deleteSchedule = (id, sender) => {
    const obj = schedule.filter((data) => data.id !== id && data.sender == sender);
    fs.writeFileSync(path.join(process.cwd(), 'database/schedule.json'), JSON.stringify(obj))
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
    updateActivitySchedule,
    updateTimeSchedule,
    deleteSchedule,
    addUser,
    findOneUser,
    findAllUser
}