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
            await System.update({ status: 'ban' }, { where: { id: systemId } });
            await Session.destroy({ where: { system_id: systemId } });
        } else if (statusCode === DisconnectReason.loggedOut) {
            console.log("Bot Turu...", systemId);
            await System.update({ status: 'turu' }, { where: { id: systemId } });
            await Session.destroy({ where: { system_id: systemId } });
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionReplaced || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.unavailableService || statusCode === DisconnectReason.badSession || statusCode === DisconnectReason.multideviceMismatch) {
            try {
                await dann[systemId][1].ev.removeAllListeners();
            } catch (error) {};
            main(systemId, true);
            await System.update({ status: 'berak' }, { where: { id: systemId } });
            console.log("Bot berak bentar...", systemId);
        } else if (statusCode === DisconnectReason.restartRequired) {
            await dann[systemId][1].ev.removeAllListeners();
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
        dann[system.id] = dann[system.id] ? dann[system.id] : [];
        dann[system.id][0] = await useCustomAuthState(system.id);        
        dann[system.id][1] = makeWASocket({
            logger,
            qrTimeout: 240_000,
            syncFullHistory: false,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 120_000,
            auth: dann[system.id][0].state,
        });

        delay(4000)
        .then(async () => {
            if (!dann[system.id][1].authState?.creds?.registered) {
                await dann[system.id][1].requestPairingCode(system.botNumber).then(async res => {
                    await system.update({ pairCode: res });
                    if (resolve && typeof resolve === "function") resolve(res);
                });
            }
        });

        dann[system.id][1].ev.on('creds.update', dann[system.id][0].saveCreds);
        dann[system.id][1].ev.on('connection.update', (update) => connectionupdate(update, system.id, timeoutPair));
        dann[system.id][1].ev.on('messages.upsert', (update) => handlerMessage(update, system.id));
    }
    if (forSystem) return initBot();
    else {
        let timeoutPair = setTimeout(async () => {
            await System.update({ status: 'turu', pairCode: "" }, { where: { id: systemId } });
            try { dann[systemId][1].end() } catch (e) {};
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

runOnBackground();

module.exports = main;