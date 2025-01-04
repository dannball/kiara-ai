const metadataCache = new Map();

exports.groupMetadata = async (conn, msg) => {
	if (msg.key.remoteJid.endsWith("@g.us") && !metadataCache.has(msg.key.remoteJid)) {
		let i = await conn.groupMetadata(msg.key.remoteJid);
		metadataCache.set(msg.key.remoteJid, i);
		return i;
	}
	switch (msg.messageStubType) {
		case 21:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				chat.subject = msg.messageStubParameters.join();
				chat.subjectOwner = msg.sender;
				chat.subjectTime = Date.now();
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 25:
			{
				if (msg.messageStubParameters.includes("off")) {
					let chat = metadataCache.get(msg.key.remoteJid);
					chat.restrict = false;
					metadataCache.set(msg.key.remoteJid, chat);
				} else if (msg.messageStubParameters.includes("on")) {
					let chat = metadataCache.get(msg.key.remoteJid);
					chat.restrict = true;
					metadataCache.set(msg.key.remoteJid, chat);
				}
			}
			break;
		case 26:
			{
				if (msg.messageStubParameters.includes("off")) {
					let chat = metadataCache.get(msg.key.remoteJid);
					chat.announce = false;
					metadataCache.set(msg.key.remoteJid, chat);
				}
				if (msg.messageStubParameters.includes("on")) {
					let chat = metadataCache.get(msg.key.remoteJid);
					chat.announce = true;
					metadataCache.set(msg.key.remoteJid, chat);
				}
			}
			break;
		case 27:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				for (let u of msg.messageStubParameters) {
					chat.participants.push({ id: u, admin: null });
					chat.size += 1;
				}
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 28:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				for (let i of msg.messageStubParameters) {
					chat.size -= 1;
					chat.participants.splice(
						chat.participants.findIndex(v => v.id == i),
						1
					);
				}
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 29:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				for (let i of msg.messageStubParameters) {
					chat.participants.splice(
						chat.participants.findIndex(v => v.id == i),
						1
					);
					chat.participants.push({ id: i, admin: "admin" });
				}
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 30:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				for (let i of msg.messageStubParameters) {
					chat.participants.splice(
						chat.participants.findIndex(v => v.id == i),
						1
					);
					chat.participants.push({ id: i, admin: null });
				}
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 32:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				for (let i of msg.messageStubParameters) {
					chat.participants.splice(
						chat.participants.findIndex(v => v.id == i),
						1
					);
					chat.size -= 1;
				}
				metadataCache.set(msg.key.remoteJid, chat);
			}
			break;
		case 71:
			{
				let chat = metadataCache.get(msg.key.remoteJid);
				chat.participants.push({
					id: msg.messageStubParameters.join(),
					admin: null
				});
				chat.size += 1;
				metadataCache.set(ctx.key.remoteJid, chat);
			}
			break;
		default:
	}
	let meta = metadataCache.get(msg.key.remoteJid);
	return meta;
}