const { parseMessage } = require('./parse-messsage')

const config = require('../config');
const { delay } = require('baileys');
const { fetchGeminiResponse } = require('./gemini');
const { Chat, User, Schedule, Token, RuleToken } = require('../database');

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
            await Chat.create({ role: 'user', user_id: user.id, system_id: systemId, content: m.text });

            let chats = await Chat.findAll({ where: { user_id: user.id, system_id: systemId }, order: [['id', 'DESC']], attributes: { exclude: ['user_id', 'system_id'] } });
            let schedules = await Schedule.findAll({ where: { user_id: user.id, system_id: systemId }, attributes: { exclude: ['user_id', 'system_id'] } });
            let stringSchedules = JSON.stringify(schedules.map(data => data.toJSON()))
            let stringChats = JSON.stringify(chats.map(data => data.toJSON()));

            // Consume the chats while converted by tokens user;
            const totalTokenAdd = await Token.sum('amount', { where: { is_added: true, user_id: user.id } }) || 0;
            const totalTokenUsed = await Token.sum('amount', { where: { is_added: false, user_id: user.id } }) || 0;
            const tokenAvailableUser = totalTokenAdd - totalTokenUsed;
            const chatsCharacterLength = stringChats.length;

            let ruleToken = await RuleToken.findOne({ where: { character: { [Op.lte]: chatsCharacterLength } }, order: [['character', 'DESC']] }) || await RuleToken.findOne({ order: [['character', 'DESC']] });

            if (!ruleToken) {
                console.log('Gagal menemukan rule token. Mohon cek konfigurasi database 🙏', { ruleToken });
                throw 'Terjadi kesalahan internal kiara, maap yaa\nCODE: 1472A'
            }

            if (tokenAvailableUser < 1) {
                throw 'Uhmmm, maap banget nih token kamu udah abis 😣\nTp aman ko schedule kamu tetap jalan 😊';
            }

            const tokenToConsume = Math.min(tokenAvailableUser, ruleToken.amount);
            await Token.create({ amount: tokenToConsume, is_added: false, user_id: user.id });

            let system = config.aiSystem
            .replaceAll('%%userSchedule%%', stringSchedules)
            .replaceAll('%%chatHistory%%', stringChats);
            let res = await fetchGeminiResponse(system);

            try {
                let jsons = JSON.parse(res);
                if (Array.isArray(jsons)) {
                    for await (let json of jsons) {
                        await delay(1000);
                        if (json.is_added) await Schedule.create({ id: json.id, activity: json.activity, date: new Date(json.time), user_id: user.id, system_id: systemId });
                        if (json.is_activity_updated) await Schedule.update({ activity: json.activity }, { where: { id: json.id, user_id: user.id, system_id: systemId }});
                        if (json.is_time_updated) await Schedule.update({ date: new Date(json.time) }, { where: { id: json.id, user_id: user.id, system_id: systemId } });
                        if (json.is_deleted) await Schedule.update({ is_deleted: true }, { where: { id: json.id, user_id: user.id, system_id: systemId } });
                        await m.reply(json.message);
                    }
                    await Chat.bulkCreate(jsons.map(v => ({ role: 'assistant', content: v.message, user_id: user.id, system_id: systemId }) ));

                } else m.reply(jsons.message || "Coba ulangi chatnya saya tidak mengerti!");
            } catch(err) {
                console.log(err);
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