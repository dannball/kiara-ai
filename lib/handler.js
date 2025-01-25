const { parseMessage } = require('./parse-messsage')
const { groupMetadata } = require('./group-cache');
// const { 
//     addUser,
//     findOneUser,
//     addSchedule,
//     updateTimeSchedule,
//     updateActivitySchedule,
//     deleteSchedule,
//  } = require('./lib/schema-db');
const config = require('../config');
const { delay } = require('baileys');

const cache = {};

exports.handlerMessage = async (msg, conn) => {
    msg = msg.messages[0];
    let metadata;
    if (msg.key.remoteJid.endsWith("@g.us")) metadata = await groupMetadata(msg, conn);
    if (msg.key.fromMe) return;
    const m = parseMessage(conn, msg, metadata);

    try {
        // if (m.text && m.isPrivate) {
        //     let user = findOneUser(m.sender, "sender");
        //     if (!user) {
        //         addUser(m.sender, m.pushName, []);
        //         throw "Halo!!!!!\naku Kiara, asisten pribadi kamu sekarang! aku akan membantu kamu untuk mengatur waktumu";
        //     }
        //     cache[m.sender] = [];
        //     let db = cache[m.sender]
        //     db.push({ role: 'user', content: m.text.slice(0, 400) });
        //     let system = config.aiSystem.replaceAll('%%data%%', JSON.stringify(schedule.filter(d => d.sender == m.sender).map(data => ({ id: data.id, title: data.title, activity: data.activity, timestamp: data.timestamp }))));
        //     let res = await metaLlama([{ role: 'system', content: system }, ...db]);
        //     if (res.detail) return m.reply(res.detail?.error || res.detail);
        //     let content = res.choices?.[0]?.message?.content;
        //     console.log(system)
        //     console.log(content)
        //     try {
        //         let jsons = JSON.parse(content);
        //         if (Array.isArray(jsons)) {
        //             for await (let json of jsons) {
        //                 await delay(500);
        //                 if (json.is_added) addSchedule(json.id, json.title, json.activity, json.time, m.sender);
        //                 if (json.is_activity_updated) updateActivitySchedule(json.id, m.sender, json.time);
        //                 if (json.is_time_updated) updateTimeSchedule(json.id, m.sender, json.time);
        //                 if (json.is_deleted) deleteSchedule(json.id, m.sender);
        //                 await m.reply(json.message);
        //                 db.push({ role: 'assistant', content: json.message });
        //             }
        //         } else m.reply(jsons.message || "Coba ulangi chatnya saya tidak mengerti!");
        //     } catch(err) {
        //         console.log(err)
        //         m.reply(content);
        //     }
        // }
    } catch(err) {
        if (typeof err === "string") return m.reply(err)
        else {
            m.reply(`Terjadi masalah dengan kiara, maaf yaa, coba lagi nanti!!!`);
            console.log(err);
        }
    }

}