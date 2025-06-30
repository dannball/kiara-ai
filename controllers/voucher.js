const { Voucher, UserVoucher, User } = require('../database');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        // let apikey = req.headers['x-api-key'];
        // if (!apikey) return next();
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null, message = "Success";

        switch (command) {

            case 'voucher:getVoucherById': {
                let { id } = body;
                if (isNaN(id)) throw new Error("ID diperlukan!");
                let vo = await Voucher.findOne({ where: { id }, include: [{ model: UserVoucher, as: 'claimed' }] })
                if (!vo) throw new Error("Voucher tidak ditemukan! (404)");
                data = vo.toJSON();
            } break;

            case 'voucher:getVoucherByCode': {
                let { code, userId } = body;
                if (!code) throw new Error("Masukkan code voucher!");
                let vo = await Voucher.findOne({ where: { code } });
                if (!vo) throw new Error("Voucher tidak ditemukan! (404)");
                let userVo = await UserVoucher.findOne({ where: {} })
                data = vo.toJSON();
            } break;

            default:
                throw new Error("API tidak ada! (404)");
        }
        return res.status(200).json({ error: false, code: 200, message, data });
    } catch (error) {
        if (typeof error?.message === "string" || typeof error === "string") {
            error = error.message || error;
            let matchCode = parseInt(error.match(/\(\s*(\d+)\s*\)/)?.[1]) || 400;
            if (/(jwt|expired|malformed)/gi.test(error)) matchCode = 401;
            res.status(matchCode).json({ error: true, code: matchCode, message: error })
        } else {
            res.status(500).json({ error: true, code: 500, message: "Internal server error!" })
        }
        console.log(error);
    }
}