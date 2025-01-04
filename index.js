process.on("uncaughtException", console.log);
require('./lib/call-db');
require('dotenv/config');
const { makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('baileys');
const { handlerMessage } = require("./handler");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const { numberBot } = require('./config.js');

const logger = pino({ level: "silent" });

async function connectionupdate(update, dann) {
    const { connection, lastDisconnect } = update
    if(connection === 'close') {
        const statusCode = new Boom(lastDisconnect.error).output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
            console.log("Bot Turu...");
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === DisconnectReason.connectionReplaced || statusCode === DisconnectReason.connectionLost || statusCode === DisconnectReason.unavailableService || statusCode === DisconnectReason.badSession || statusCode === DisconnectReason.multideviceMismatch) {
            try {
                await dann.ev.removeAllListeners();
            } catch (error) {};
            main();
            console.log("Bot berak bentar...");
        } else if (statusCode === DisconnectReason.restartRequired) {
            await dann.ev.removeAllListeners();
            main();
            console.log("Waiting, bot di segerin...");
        }
    } else if(connection === 'open') {
        console.log('Bot udah ready...');
    }
}

async function main() {
    const { state, saveCreds } = await useMultiFileAuthState('dann');
    const dann = makeWASocket({
        logger,
        qrTimeout: 240_000,
        syncFullHistory: false,
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30_000,
        auth: state,
    });

    delay(4000).then(async () => {
            if (!dann.authState?.creds?.registered) {
                await dann.requestPairingCode(numberBot).then(res => {
                console.log(res);
            })
        }
    });

    dann.ev.on('creds.update', saveCreds);
    dann.ev.on('connection.update', (update) => connectionupdate(update, dann));
    dann.ev.on('messages.upsert', (update) => handlerMessage(update, dann));
}

main();

// console.log(DisconnectReason)