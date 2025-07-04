const { System } = require('../database');
const { main } = require('../lib/bot');
const authMiddleware = require('../lib/middlewares/auth');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        console.log(command);
        let data = null;

        switch (command) {

            case 'bot:list': {
                await authMiddleware(req, ['dev']);
                const result = await System.findAll({ where: {}, attributes: { exclude: ["pairCode"] } });
                data = result.map(d => d.toJSON());
            } break;

            case 'bot:create': {
                await authMiddleware(req, ['dev']);
                let { botNumber, systemName } = body;
                if (!systemName) throw new Error("nama Sistem diperlukan!");
                if (!botNumber) throw new Error("bot number diperlukan!");
                const result = await System.create({ botNumber, name: systemName });
                data = result.id;
            } break;

            case 'bot:start': {
                await authMiddleware(req, ['dev']);
                let { systemId, override } = body;
                let result = await System.findOne({ where: { id: systemId }});
                if (!result.botNumber) throw new Error("Bot number masih kosong!");
                if (result.status == 'siap' && !override) throw new Error("Bot sebelumnya udah idup");
                result.isOffline = false;
                result.pairCode = "";
                await result.save();
                await main(result.id, true);
                data = { started: true };
            } break;

            case 'bot:stop': {
                await authMiddleware(req, ['dev']);
                let { systemId } = body;
                let result = await System.findOne({ where: { id: systemId }});
                if (!result?.botNumber) throw new Error("Bot number masih kosong!");
                let conn = dann[result.id]?.conn;
                if (['berak', 'turu', 'ban'].includes(result.status)) throw new Error("Bot sebelumnya udah mati");
                result.isOffline = true;
                await result.save();
                try { await conn.end() } catch (e) {}
                if (conn) delete dann[result.id].conn;
                data = result;
            } break;

            case 'bot:getpaircode': {
                await authMiddleware(req, ['dev']);
                let { systemId } = body;
                let result = await System.findOne({ where: { id: systemId }});
                if (!result) throw new Error("Bot tidak ditemukan! (404)")
                    if (!result.botNumber) throw new Error("Bot number masih kosong!");
                if (result.status == 'siap') throw new Error("Pairing code tidak tersedia dengan status\"siap\"");
                result = result.pairCode && !["turu", "ban", "berak"].includes(result.status) ? result.toJSON() : await main(result.id);
                data = result;
            } break;

            case 'bot:getstatus': {
                await authMiddleware(req, ['dev']);
                let { systemId } = body;
                const result = await System.findOne({ where: { id: systemId }}).then(s => s.toJSON());
                data = result;
            } break;

            case 'bot:delete': {
                await authMiddleware(req, ['dev']);
                let { systemId } = body;
                const result = await System.destroy({ where: { id: systemId }});
                data = result;
            } break;
            
            case 'bot:update': {
                await authMiddleware(req, ['dev']);
                let { systemId, botNumber, systemName } = body;
                const result = await System.update({ 
                    ...(botNumber ? {botNumber} : {}), 
                    ...(systemName ? { name: systemName } : {}) 
                }, { 
                    where: { id: systemId }
                });
                data = result;
            } break;

            default:
                return next();
        }
        return res.status(200).json({ data });
    } catch (error) {
        if (typeof error?.message === "string" || typeof error === "string") {
            error = error.message || error;
            let matchCode = parseInt(error.match(/\(\s*(\d+)\s*\)/)?.[1]) || 400;
            if (/(jwt|expired|malformed)/gi.test(error)) matchCode = 401;
            res.status(matchCode).json({ error: error })
        } else {
            res.status(500).json({ error: "Internal server error!" })
        }
        // console.log(error);
    }
}