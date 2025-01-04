const { parseMessage } = require('./lib/parse-messsage')
const { groupMetadata } = require('./lib/group-cache');
const { 
    addUser,
    findOneUser,
 } = require('./lib/schema-db');
const { metaLlama } = require('./lib/api-post');
const config = require('./config');

const msg = {};

exports.handlerMessage = async (msg, conn) => {
    msg = msg.messages[0];
    let metadata;
    if (msg.key.remoteJid.endsWith("@g.us")) metadata = await groupMetadata(msg, conn);
    if (msg.key.fromMe) return;
    const m = parseMessage(conn, msg, metadata);

    try {
        if (m.text) {
            let user = findOneUser(m.sender, "sender");
            if (!user) {
                addUser(m.sender, m.pushName, []);
                throw "Halo!!!!!\naku Kiara, asisten pribadi kamu sekarang! aku akan membantu kamu untuk mengatur waktumu";
            }
            let res = await metaLlama([{ role: 'system', content: config.aiSystem }, { role: 'user', content: m.text }])
            let content = res.choices?.[0]?.message?.content;
            m.reply(content)
        }
        console.log(m);
    } catch(err) {
        if (typeof err === "string") return m.reply(err)
        else {
            m.reply(`Terjadi masalah dengan kiara, maaf yaa, coba lagi nanti!!!`);
            console.log(err);
        }
    }

}