const { Voucher, UserVoucher, User, Token } = require('../database');
const authMiddleware = require('../lib/middlewares/auth');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

            case "voucher:check": {
                await authMiddleware(req, ['user']);
                const { code } = body;
                if (!code) throw new Error("Kode voucher tidak boleh kosong!");
            
                const voucher = await Voucher.findOne({ where: { code } });
                if (!voucher) throw new Error("Voucher tidak ditemukan!");
            
                const isUsed = await UserVoucher.findOne({
                    where: {
                        user_id: req.user.id,
                        voucher_id: voucher.id
                    }
                });
            
                if (isUsed) throw new Error("Voucher ini sudah pernah kamu gunakan!");

                if (voucher.max_claim !== null) {
                    const totalClaim = await UserVoucher.count({ where: { voucher_id: voucher.id } });
                    if (totalClaim >= voucher.max_claim) throw new Error("Voucher sudah mencapai batas klaim!");
                }
            
                data = {
                    id: voucher.id,
                    code: voucher.code,
                    discount: voucher.discount,
                    type: voucher.type,
                    description: voucher.description
                };
            }
            break;

            case "voucher:add": {
                await authMiddleware(req, ['dev']);
                const { code, description, date, max_claim, discount, type } = body;
            
                if (!code || !discount || !type) throw new Error("Kode, discount, dan tipe wajib diisi!");
            
                const exists = await Voucher.findOne({ where: { code } });
                if (exists) throw new Error("Kode voucher sudah terdaftar!");
            
                const voucher = await Voucher.create({
                    code,
                    description,
                    date,
                    max_claim,
                    discount,
                    type
                });
            
                data = { isAdded: true, voucher };
            }
            break;
            
            case "voucher:checkReedem": {
                await authMiddleware(req, ['user']);
                const { code } = body;
                let user = req.user;
                
                const voucher = await Voucher.findOne({ where: { code, type: 'token' } });
                if (!voucher) throw new Error("Voucher tidak ditemukan!");

                const isUsed = await UserVoucher.findOne({ where: { user_id: user.id, voucher_id: voucher.id } });
                if (isUsed) throw new Error("Voucher sudah pernah digunakan!");
                data = { voucher };
            }
            break;

            case "voucher:reedem": {
                await authMiddleware(req, ['user']);
                const { id } = body;
                let user = req.user;
                const voucher = await Voucher.findOne({ where: { id, type: 'token' } });
                if (!voucher) throw new Error("Voucher tidak ditemukan!");

                const isUsed = await UserVoucher.findOne({ where: { user_id: user.id, voucher_id: voucher.id } });
                if (isUsed) throw new Error("Voucher sudah pernah digunakan!");

                await Token.create({ amount: voucher.token, is_add: true, user_id: user.id });
                await UserVoucher.create({ user_id: user.id, voucher_id: voucher.id });

                data = { isClaimed: true };
            }
            break;

            case "voucher:update": {
                await authMiddleware(req, ['dev']);
                const { id, code, description, date, max_claim, discount, type } = body;
            
                const voucher = await Voucher.findByPk(id);
                if (!voucher) throw new Error("Voucher tidak ditemukan!");
            
                voucher.code = code || voucher.code;
                voucher.description = description || voucher.description;
                voucher.date = date || voucher.date;
                voucher.max_claim = max_claim ?? voucher.max_claim;
                voucher.discount = discount ?? voucher.discount;
                voucher.type = type || voucher.type;
            
                await voucher.save();
            
                data = { isUpdated: true, voucher };
            }
            break;
            
            case "voucher:delete": {
                await authMiddleware(req, ['dev']);
                const { id } = body;
            
                const voucher = await Voucher.findByPk(id);
                if (!voucher) throw new Error("Voucher tidak ditemukan!");
            
                await UserVoucher.destroy({ where: { voucher_id: id } }); // delete claim data
                await voucher.destroy();
            
                data = { isDeleted: true };
            }
            break;
            
            case "voucher:list": {
                await authMiddleware(req, ['dev']);
            
                const vouchers = await Voucher.findAll({
                    include: [{
                        model: UserVoucher,
                        include: [{ model: User, attributes: ['id', 'username', 'email'] }]
                    }],
                    order: [['id', 'DESC']]
                });
            
                data = vouchers.map(voucher => ({
                    id: voucher.id,
                    code: voucher.code,
                    description: voucher.description,
                    discount: voucher.discount,
                    type: voucher.type,
                    date: voucher.date,
                    max_claim: voucher.max_claim,
                    total_claimed: voucher.user_vouchers.length,
                    claimed_by: voucher.user_vouchers.map(uv => ({
                        user_id: uv.user.id,
                        username: uv.user.username,
                        email: uv.user.email
                    }))
                }));
            }
            break;

            case "voucher:chart": {
                await authMiddleware(req, ['dev']);
                const { voucherId } = body;
            
                const where = {};
                if (voucherId) where.voucher_id = voucherId;
            
                const { fn, col, literal } = require('sequelize');
            
                const result = await UserVoucher.findAll({
                    where,
                    attributes: [
                        [fn('DATE', col('createdAt')), 'date'],
                        [fn('COUNT', col('id')), 'claimed']
                    ],
                    group: [literal('DATE(createdAt)')],
                    order: [literal('DATE(createdAt) ASC')]
                });
            
                data = result.map(r => ({
                    date: r.get('date'),
                    claimed: parseInt(r.get('claimed'))
                }));
            }
            break;
            
            case "voucher:stat": {
                await authMiddleware(req, ['dev']);
            
                const totalVoucher = await Voucher.count();
                const totalClaim = await UserVoucher.count();
                const uniqueUserClaim = await UserVoucher.aggregate('user_id', 'count', { distinct: true });
            
                data = {
                    totalVoucher,
                    totalClaim,
                    uniqueUserClaim
                };
            }
            break;
            
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
        console.log(error);
    }
}