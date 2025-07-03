const axios = require('axios');
const { downloadContentFromMessage, jidDecode } = require('baileys');
const { User } = require('../database');
const { hashSync, genSaltSync } = require('bcrypt');

function decodeJid(jid) {
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return ((decode.user && decode.server && decode.user + "@" + decode.server) || jid).trim();
    } else return jid.trim();
}

async function createAccountDeveloper() {
    const { DEVELOPER_ACCOUNT: accounts } = process.env;
    let hashed = (password) => hashSync(password, genSaltSync(10));
    let users = (accounts || '').split('|') // pisah antar akun
        .map((account, index) => {
            const [email, username, password] = account.split(':');
            return { id: index, email, username, password: hashed(password), is_verify: true, role: 'dev' };
        });
    
    await User.bulkCreate(users, { updateOnDuplicate: ['password', 'role'] });
}

function parseAnyJid(args) {
    const convertJidStringOrNumber = arg => {
        if (typeof arg === "number") arg = arg.toString();
        if (typeof arg === "string" && !arg.endsWith("@s.whatsapp.net") && /[^0-9]/g.test(arg)) arg = arg.replace(/[^0-9]/g, "");
        if (typeof arg === "string" && arg.startsWith("08") && /[0-9]/g.test(arg)) arg = arg.slice(1).padStart(arg.length + 1, "62");
        if (typeof arg === "string" && !arg.endsWith("@s.whatsapp.net")) arg = arg + "@s.whatsapp.net";
        return arg;
    };
    if (Array.isArray(args)) return args.map(v => convertJidStringOrNumber(v));
    if (/(number|string)/i.test(typeof args)) return convertJidStringOrNumber(args);
}

function matchTag(query) {
    return [...String(query).matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + "@s.whatsapp.net");
}

function downloadMessage(message, types) {
    return new Promise(async (resolve, reject) => {
        let buffer = Buffer.from([]);
        await downloadContentFromMessage(message, types.replace(/Message/g, ""))
            .then(async stream => {
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                resolve(buffer);
            })
            .catch(e => reject(e));
    });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (err) {
        return false;
    }
}

function getBuffer(url) {
    return new Promise(async (resolve, reject) => {
        const res = await axios({ method: "get", url, headers: { DNT: 1, "Upgrade-Insecure-Request": 1 }, responseType: "arraybuffer" });
        resolve(res.data);
    });
}

module.exports = {
    matchTag,
    decodeJid,
    getBuffer,
    isValidUrl,
    parseAnyJid,
    downloadMessage,
    createAccountDeveloper,
}