const { makeWASocket, DisconnectReason, delay, proto, BufferJSON, initAuthCreds } = require('baileys');
const { handlerMessage } = require("./handler");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const {Session, System} = require('../database');
const { Op } = require('sequelize');

const logger = pino({ level: "silent" });

async function useCustomAuthState(systemId) {
    let credData = await Session.findOne({ where: { type: 'creds', key: `creds`, system_id: systemId } });
    let checkCredRegistered = JSON.parse(credData?.value || '{}', BufferJSON.reviver)?.registered || false;
    let creds = credData && checkCredRegistered ? JSON.parse(credData.value, BufferJSON.reviver) : initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = await Session.findAll({ where: { type, key: ids.map(d => `${type}-${d}`), system_id: systemId }, attributes: ["key", "value"] }).then(r => r.map(s => s.toJSON()));
                    const result = {};
                    await Promise.all(data.map(async ({ key, value }) => {
                        value = value ? JSON.parse(value, BufferJSON.reviver) : null;
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        result[key] = value;
                    }));
                    return result;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id];
                            tasks.push({
                                type,
                                key: `${type}-${id}`,
                                value: JSON.stringify(value, BufferJSON.replacer),
                                is_deleted: value ? false : true,
                            });
                        }
                    };
                    await Promise.all(tasks);
                    let keysToWrite = tasks.filter(d => !d.is_deleted).map(d => ({ type: d.type, key: d.key, value: d.value, system_id: systemId }))
                    if (keysToWrite[0]) {
                        try {
                            await Session.bulkCreate(keysToWrite, { updateOnDuplicate: ["value"] });
                        } catch (error) {
                            console.log(error)
                        }
                    }

                    const keysToDelete = tasks.filter(d => d.is_deleted).map(d => ({ type: d.type, key: d.key }));
                    if (keysToDelete[0]) {
                        try {
                            await Session.destroy({ where: { [Op.and]: keysToDelete.map(({ type, key }) => ({ type, key })), system_id: systemId } });
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
            }
        },
        saveCreds: () => {
            return Session.bulkCreate([{ type: 'creds', key: `creds`, system_id: systemId, value: JSON.stringify(creds, BufferJSON.replacer) }], { updateOnDuplicate: ["value"] })
        }
    };
}

async function connectionupdate(update, systemId, timeoutPair) {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
        const statusCode = new Boom(lastDisconnect.error).output?.statusCode;
        if (statusCode === DisconnectReason.forbidden) {
            console.log("Bot Turu...", systemId);
            await System.update({ status: 'ban', isOffline: true }, { where: { id: systemId } });
            await Session.destroy({ where: { system_id: systemId } });
        } else if (statusCode === DisconnectReason.loggedOut) {
            console.log("Bot Turu...", systemId);
            await System.update({ status: 'turu', isOffline: true }, { where: { id: systemId } });
            await Session.destroy({ where: { system_id: systemId } });
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionReplaced || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.unavailableService || statusCode === DisconnectReason.badSession || statusCode === DisconnectReason.multideviceMismatch) {
            let system = await System.findOne({ where: { id: systemId } });
            try {
                await dann[systemId].conn.ev.removeAllListeners();
            } catch (error) {};
            if (!system.isOffline) main(systemId, true);
            await system.update({ status: 'berak' });
            console.log("Bot berak bentar...", systemId);
        } else if (statusCode === DisconnectReason.restartRequired) {
            await dann[systemId].conn.ev.removeAllListeners();
            main(systemId, true);
            console.log("Waiting, bot di segerin...", systemId);
        }
    } else if(connection === 'open') {
        if (timeoutPair) clearTimeout(timeoutPair);
        await System.update({ status: 'siap' }, { where: { id: systemId } });
        console.log('Bot udah ready...', systemId);
    }
}

async function main(systemId, forSystem, timeoutPair) {
    let initBot = async (resolve) => {
        const system = await System.findOne({ where: { id: systemId }, attributes: ["id", "botNumber"] });
        if (!system) return;
        dann[systemId] = dann[systemId] ? dann[systemId] : {};
        dann[systemId].auth = await useCustomAuthState(systemId);        
        dann[systemId].conn = makeWASocket({
            logger,
            qrTimeout: 240_000,
            syncFullHistory: false,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 120_000,
            auth: dann[systemId].auth.state,
        });

        delay(4000)
        .then(async () => {
            if (!dann[systemId]?.conn?.authState?.creds?.registered) {
                await dann[systemId].conn.requestPairingCode(system.botNumber).then(async res => {
                    await system.update({ pairCode: res });
                    if (resolve && typeof resolve === "function") resolve(res);
                });
            }
        });

        dann[systemId].conn.ev.on('creds.update', dann[systemId].auth.saveCreds);
        dann[systemId].conn.ev.on('connection.update', (update) => connectionupdate(update, systemId, timeoutPair));
        dann[systemId].conn.ev.on('messages.upsert', (update) => handlerMessage(update, systemId));
    }
    if (forSystem) return initBot();
    else {
        let timeoutPair = setTimeout(async () => {
            await System.update({ status: 'turu', pairCode: "" }, { where: { id: systemId } });
            try { dann[systemId].conn.end() } catch (e) {};
            console.log("Bot di stop oleh sistem otomatis", systemId);
        }, 120_000);
        return new Promise((resolve) => initBot(resolve, true, timeoutPair));
    }
}

async function runOnBackground() {
    const results = await Session.findAll({ where: { type: 'creds' }, include: [{ model: System, attributes: ["status", "pairCode"] }] }).then(r => r.map(s => s.toJSON()));
    for (let result of results) {
        let isReg = JSON.parse(result?.value || '{}')?.registered || false;
        if (isReg && result?.system.status == 'siap') main(result.system_id, true);
    }
}

module.exports = {main, runOnBackground};