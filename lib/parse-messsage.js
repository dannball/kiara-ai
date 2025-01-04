const { proto, areJidsSameUser, generateWAMessageFromContent, prepareWAMessageMedia } = require('baileys');
const { decodeJid, downloadMessage, isValidUrl, getBuffer, matchTag } = require('./helper');
const { readFileSync, existsSync } = require('fs');
const { prefix } = require('../config.js');

exports.parseMessage = (conn, msg, metadata) => {
    msg.conn = conn;
    if (!msg.message) return;
    if (msg.message && msg.message?.messageContextInfo) delete msg.message["messageContextInfo"]
    if (msg.message && msg.message?.senderKeyDistributionMessage) delete msg.message["senderKeyDistributionMessage"]
	msg.id = msg.key.id;
	msg.isBot = (msg.id?.startsWith("3EB0") || msg.id?.length < 32) || false;
	const senderKeyDistributionMessage = msg.message?.senderKeyDistributionMessage?.groupId;
	msg.chat = decodeJid(msg.key?.remoteJid || (senderKeyDistributionMessage && senderKeyDistributionMessage !== "status@broadcast") || "");
	msg.isGroup = msg.chat.endsWith("@g.us");
	msg.isPrivate = msg.chat.endsWith("@s.whatsapp.net");
    msg.botNumber = decodeJid(conn.user?.id || "");
    msg.sender = decodeJid((msg.key?.fromMe && conn.user?.id) || msg.participant || msg.key.participant || msg.chat || "");
    msg.fromMe = msg.key?.fromMe || areJidsSameUser(conn.user?.id, msg.sender) || false;
    let mtype = Object.keys(msg.message ?? {});
    msg.type = mtype[0];
    msg.msg = msg.message[msg.type];
    if (["documentWithCaptionMessage", "viewOnceMessageV2"].includes(mtype[0])) {
        msg.type = Object.keys(msg.message[mtype[0]].message)[0];
        msg.msg = msg.message[mtype[0]].message[msg.type];
    } else if (["editedMessage"].includes(mtype[0])) {
        msg.type = Object.keys(msg.message[mtype[0]].message.protocolMessage.editedMessage)[0];
        msg.msg = msg.message[mtype[0]].message.protocolMessage.editedMessage[msg.type];
    }
    msg.expiration = msg.msg?.contextInfo?.expiration || 0
    msg.mime = msg.msg?.mimetype || null;
    msg.sec = msg.msg?.seconds || -1;
    let text = (typeof msg.msg === "string" ? msg.msg : msg.msg?.text) || msg.msg?.selectedId || msg.msg?.caption || msg.msg?.contentText || "";
    if (msg.msg && msg.msg["nativeFlowResponseMessage"]) text = JSON.parse(msg.msg.nativeFlowResponseMessage.paramsJson);
	msg.text = typeof text === "string" ? text : text?.id || text?.selectedDisplayText || text?.hydratedTemplate?.hydratedContentText || text || "";
    msg.mentions = (msg.msg?.contextInfo?.mentionedJid?.length && msg.msg.contextInfo.mentionedJid) || [];
    msg.download = () => downloadMessage(msg.msg, msg.type);
    const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    let match = (
        prefix instanceof RegExp ? [[prefix?.exec(msg.text), prefix]] : Array.isArray(prefix) ? prefix?.map(p => {
            let re = p instanceof RegExp /* RegExp in Array? */ ? p : new RegExp(str2Regex(p));
            return [re.exec(msg.text), re];
        }) : typeof prefix === "string" ? [[new RegExp(str2Regex(prefix)).exec(msg.text), new RegExp(str2Regex(prefix))]] : [[[], new RegExp()]]
    ).find(p => p[1]);
    msg.prefix = match[0]?.[0] || "#";
    msg.isCmd = msg.text.startsWith(msg.prefix);
    msg.command = msg.isCmd ? msg.text.replace(msg.prefix, "").split(/ +/).shift().toLowerCase() : "";
    msg.customprefix = msg.text.split(/ +/).shift().toLowerCase();
    msg.cq = msg.text.split(/ +/).slice(1).join(" ");
    msg.args = msg.isCmd ? msg.text.replace(msg.prefix, "").split(/ +/).slice(1) : [];
    msg.q = msg.args.join(" ");
    const contextInfo = msg.msg?.contextInfo;
    const quoted = contextInfo?.quotedMessage;
    if (quoted) {
        const type = Object.keys(quoted)[0];
        let q = quoted[type], qtype;
        if (["documentWithCaptionMessage", "viewOnceMessageV2", "viewOnceMessage"].includes(type)) {
            qtype = Object.keys(q.message)[0];
            q = q.message[qtype];
        }
        msg.quoted = {}
        msg.quoted.id = contextInfo.stanzaId;
        msg.quoted.type = qtype ?? type;
        msg.quoted.mime = q.mimetype || null;
        msg.quoted.sec = q.seconds || null;
        msg.quoted.chat = contextInfo.remoteJid || msg.chat;
        msg.quoted.isBot = (msg.quoted.id?.startsWith("3EB0") || msg.quoted.id.length < 32) || false;
        msg.quoted.sender = decodeJid(contextInfo.participant || msg.chat || "");
        msg.quoted.expiration = contextInfo.expiration ?? msg.expiration;
        msg.quoted.fromMe = areJidsSameUser(msg.quoted.sender, conn.user.id);
        msg.quoted.text = typeof q === "string" ? q : (q.text || q.caption || q.contentText || "");
        msg.quoted.mentions = q.contextInfo?.mentionedJid || [];
        msg.quoted.download = () => downloadMessage(q, msg.quoted.type);
    }
    msg.groupMetadata = (chat) => {
        if (!chat) chat = msg.chat;
        if (chat) return metadataCache.get(chat);
        else return metadata;
    }
    msg.groupAllMembers = (chat) => {
            return msg.groupMetadata(chat)?.participants?.map(({ id }) => id) || [];
        }
    msg.groupAdmins = (chat) => {
        return (
            msg.groupMetadata(chat)
                ?.participants?.filter(({ admin }) => admin)
                ?.map(({ id }) => id) || []
        );
    }
    msg.groupMembers = (chat) => {
        return (
            msg.groupMetadata(chat)
                ?.participants?.filter(({ admin }) => !admin)
                ?.map(({ id }) => id) || []
        );
    }
    msg.hasAdmin = (sender, chat) => {
        if (!sender) sender = msg.sender;
        return msg.groupAdmins(chat)?.includes(sender) || false;
    }

    msg.hasMember = (sender, chat) => {
        if (!sender) sender = msg.sender;
        return msg.groupMembers(chat)?.includes(sender) || false;
    }
    msg.react = (emote) => {
        return conn.sendMessage(msg.chat, {
            react: { text: emote, key: msg.key }
        });
    }
    msg.reply = (text, args = {}) => {
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return conn?.sendMessage(args?.to ?? msg.chat, { text, mentions: [...matchTag(text), ...(args?.ments ?? [])], ...args }, { ...args, ephemeralExpiration: msg.expiration });
    }
    msg.sendButton = (chatId, text, footer, buttons, opts = {}) => {
        return new Promise(async(resolve, reject) => {
            try {
                let media = {};
                if (typeof opts.media ==="object") media = await prepareWAMessageMedia(opts.media, { upload: conn?.waUploadToServer });
                if (!Array.isArray(buttons)) return reject("Button type must be type an array example: [{ type: \"type_button\", content: <ContentButton> } ...other]");
                buttons = buttons.map(({ type, content }) => ({ name: type, buttonParamsJson: JSON.stringify(content) }));
                let msg = generateWAMessageFromContent(chatId, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                header: proto.Message.InteractiveMessage.Header.create({
                                    ...media,
                                    title: "",
                                    subtitle: "",
                                    hasMediaAttachment: false,
                                }),
                                body: proto.Message.InteractiveMessage.Body.create({ text }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                            }),
                            contextInfo: {
                                mentionedJid: [...matchTag(String(text + footer)), ...(opts?.mentions || [])]
                            }
                        },
                    }
                }, {})
                await conn?.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                resolve(msg);
            } catch(err) {
                reject(err)
            }
        })
    }

    msg.replyWithPhoto = (buffer, caption, args = {}) => {
        if (typeof args === "string") args = {};
        if (typeof caption !== "string" && typeof caption === "object") {
            args = caption;
            caption = "";
        }
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            resolve(conn?.sendMessage(args?.to ?? msg.chat, { image: buffer, caption, mentions: [...matchTag(caption), ...(args?.ments ?? [])], ...args }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }
    
    msg.replyWithVideo = (buffer, caption, args = {}) => {
        if (typeof args === "string") args = {};
        if (typeof caption !== "string" && typeof caption === "object") {
            args = caption;
            caption = "";
        }
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            resolve(conn.sendMessage(args?.to ?? msg.chat, { video: buffer, caption, mentions: [...matchTag(caption), ...(args?.ments ?? [])], ...args }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }

    msg.replyWithSticker = (buffer, args = {}) => {
        if (typeof args === "string") args = {};
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            resolve(conn.sendMessage(args.to ?? msg.chat, { sticker: buffer, mentions: args?.ments ?? [], ...args  }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }

    msg.replyWithAudio = (buffer, args = {}) => {
        if (typeof args === "string") args = {};
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            resolve(conn.sendMessage(args?.to ?? msg.chat, { audio: buffer, mentions: args?.ments ?? [], ...args }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }

    msg.replyWithDocument = (buffer, caption, args = {}) => {
        if (typeof args === "string") args = {};
        if (typeof caption === "object") {
            args = caption;
            caption = "";
        }
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            let typesBuffer = await fileTypeFromBuffer(buffer);
            if (!args.fileName) args.fileName = `BALLBOT_FILE-${new Date().toLocaleDateString()}.${typesBuffer?.ext || 'txt'}`;
            if (!args.mimetype) args.mimetype = typesBuffer?.mime;
            resolve(conn.sendMessage(args?.to ?? msg.chat, { document: buffer, caption, ...args, mentions: [...matchTag(caption), ...(args?.ments ?? [])] }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }

    msg.replyWithFile = (buffer, caption, args = {}) => {
        if (typeof args === "string") args = {};
        if (typeof caption === "object") {
            args = caption;
            caption = "";
        }
        if (!args.quoted) args.quoted = msg;
        if (args.quoted && args.quoted === "off") delete args["quoted"];
        return new Promise(async resolve => {
            buffer =
                typeof buffer === "string" && isValidUrl(buffer)
                    ? await getBuffer(buffer)
                    : typeof buffer === "string" && /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(buffer)
                    ? Buffer.from(buffer, "base64")
                    : typeof buffer === "string" && existsSync(buffer)
                    ? readFileSync(buffer)
                    : buffer;
            let typesBuffer = await fileTypeFromBuffer(buffer);
            if (!args.fileName) args.fileName = `FILE-${new Date().toLocaleDateString()}.${typesBuffer?.ext || 'txt'}`;
            if (!args.mimetype) args.mimetype = typesBuffer?.mime;
            let Props = {};
            Props["caption"] = caption;
            let mime = ["image", "video", "audio", "sticker"];
            if (/(jpg|jpeg|png)/i.test(typesBuffer.ext)) mime = mime[0];
            else if (/(mov|mp3|opus)/i.test(typesBuffer.ext)) mime = mime[2];
            else if (/webp/i.test(typesBuffer.ext)) mime = mime[3];
            else if (/(3gp|mp4|gif)/i.test(typesBuffer.ext)) mime = mime[1];
            else mime = "document";
            Props[mime] = buffer;
            if (args.docs && args.docs == false) {
                delete args.fileName;
                delete args.mimetype;
            }
            resolve(conn.sendMessage(args?.to ?? msg.chat, { ...Props, ...args, mentions: [...matchTag(caption), ...(args?.ments ?? [])] }, { ...args, ephemeralExpiration: msg.expiration }));
        });
    }
    return msg;
}