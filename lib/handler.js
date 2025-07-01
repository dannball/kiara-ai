const { parseMessage } = require('./parse-messsage')

const config = require('../config');
const { delay } = require('baileys');
const { fetchGeminiResponse } = require('./gemini');
const { Chat, User } = require('../database');

const cache = {};

exports.handlerMessage = async (msg, systemId) => {
    let conn = dann[systemId];
    msg = msg.messages[0];
    let metadata;
    if (msg.key.fromMe) return;
    const m = parseMessage(conn, msg, metadata);

    try {
        if (m.text && m.isPrivate) {
            let user = await User.findOne({ where: { sender: m.sender } });
            if (!user) {
                let mainUrl = process.env.MAIN_URL;
                throw `Sepertinya kamu belum pernah berinteraksi dengan kiara, klik link dibawah ini untuk verifikasi kamu 😉\n\n${mainUrl}/verifysender?sender=${m.sender}`;
            }
            let chats = await Chat.findAll({ where: { user_id: userId, system_id: systemId } })
            let system = config.aiSystem.replaceAll('%%data%%', JSON.stringify(schedule.filter(d => d.sender == m.sender).map(data => ({ id: data.id, title: data.title, activity: data.activity, timestamp: data.timestamp }))));
            let res = await fetchGeminiResponse(system);
            try {
                let jsons = JSON.parse(res);
                if (Array.isArray(jsons)) {
                    for await (let json of jsons) {
                        await delay(500);
                        if (json.is_added) addSchedule(json.id, json.title, json.activity, json.time, m.sender);
                        if (json.is_activity_updated) updateActivitySchedule(json.id, m.sender, json.time);
                        if (json.is_time_updated) updateTimeSchedule(json.id, m.sender, json.time);
                        if (json.is_deleted) deleteSchedule(json.id, m.sender);
                        await m.reply(json.message);
                        db.push({ role: 'assistant', content: json.message });
                    }
                } else m.reply(jsons.message || "Coba ulangi chatnya saya tidak mengerti!");
            } catch(err) {
                console.log(err)
                m.reply(content);
            }
        }
    } catch(err) {
        if (typeof err === "string") return m.reply(err)
        else {
            m.reply(`Terjadi masalah dengan kiara, maaf yaa, coba lagi nanti!!!`);
            console.log(err);
        }
    }

}