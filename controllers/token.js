const { Voucher, UserVoucher, User, Token, Package } = require('../database');
const { Mutation } = require('../database/mutation');
const authMiddleware = require('../lib/middlewares/auth');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        // let apikey = req.headers['x-api-key'];
        // if (!apikey) return next();
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

            case 'token:add': {
                await authMiddleware(req, ['dev']);
                let { userId, amountToken } = body;
                if (isNaN(userId)) throw new Error("user Id diperlukan!");
                let user = await User.findByPk(userId, { attributes: ["id"] });
                await Token.create({ user_id: user.id, amount: amountToken, is_add: true });
                data = { isAdded: true, userId, amountToken };
            } break;

            // Belum selesai
            case 'token:order': {
                await authMiddleware(req, ['user']);
                let { packageId, voucherCode, amount } = body;
            
                const user = req.user;
                if (!packageId) throw new Error("Package tidak boleh kosong!");
                if (!amount || isNaN(amount) || amount < 1) throw new Error("Jumlah pembelian tidak valid!");
            
                const _package = await Package.findOne({ where: { id: packageId } });
                if (!_package) throw new Error("Package tidak tersedia! (404)");
            
                let voucher = null;
                if (voucherCode) {
                    voucher = await Voucher.findOne({ where: { code: voucherCode } });
                    if (!voucher) throw new Error("Voucher tidak ditemukan!");
                    if (voucher.type !== "token") throw new Error("Voucher ini tidak bisa digunakan untuk pembelian token!");
            
                    const isUsed = await UserVoucher.findOne({ where: { user_id: user.id, voucher_id: voucher.id } });
                    if (isUsed) throw new Error("Voucher sudah pernah digunakan!");
                }

                const basePrice = _package.price * amount;
                const discount = voucher ? voucher.discount : 0;
                const finalPrice = Math.max(basePrice - discount, 0);
            
                const reffId = `KIARA-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

                const transaction = await Mutation.create({
                    reff_id: reffId,
                    user_id: user.id,
                    voucher_id: voucher?.id || null,
                    package_id: _package.id,
                    amount,
                    price_total: finalPrice,
                    fee: 0,
                    status: 'pending'
                });
            
                if (voucher) {
                    await UserVoucher.create({
                        user_id: user.id,
                        voucher_id: voucher.id
                    });
                }

                data = {
                    isAdded: true,
                    reffId: transaction.reff_id,
                    total: finalPrice,
                    discount,
                    amount,
                    tokenPerPackage: _package.token,
                    tokenTotal: _package.token * amount,
                    status: transaction.status
                };
            }
            break;

            case "token:used": {
                await authMiddleware(req, ['user']);
                const user = req.user;

                const tokenList = await Token.findAll({
                    where: { user_id: user.id },
                    attributes: ['amount', 'is_added']
                });
            
                const totalAdded = tokenList
                    .filter(t => t.is_added)
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
            
                const totalUsed = tokenList
                    .filter(t => !t.is_added)
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
            
                const totalAvailable = totalAdded - totalUsed;
            
                data = {
                    token_added: totalAdded,
                    token_used: totalUsed,
                    token_available: totalAvailable
                };
            }
            break;

            case "token:usedChart": {
                await authMiddleware(req, ['user']);
                const user = req.user;

                const tokens = await Token.findAll({
                    where: {
                        user_id: user.id,
                        is_added: false
                    },
                    attributes: ['amount', 'createdAt']
                });

                const chartMap = {};
            
                for (let tkn of tokens) {
                    const dateStr = new Date(tkn.createdAt).toISOString().slice(0, 10);
                    chartMap[dateStr] = (chartMap[dateStr] || 0) + (tkn.amount || 0);
                }

                const chartData = Object.entries(chartMap).map(([date, token]) => ({
                    date,
                    token
                }));
            
                data = chartData;
            }
            break;

            case "token:devList": {
                await authMiddleware(req, ['dev']);
            
                const users = await User.findAll({
                    attributes: ['id', 'username', 'email'],
                    include: [{
                        model: Token,
                        attributes: ['amount', 'is_added']
                    }]
                });
            
                const userList = users.map(user => {
                    const tokenList = user.tokens || [];
            
                    const totalAdded = tokenList
                        .filter(t => t.is_added)
                        .reduce((sum, t) => sum + (t.amount || 0), 0);
            
                    const totalUsed = tokenList
                        .filter(t => !t.is_added)
                        .reduce((sum, t) => sum + (t.amount || 0), 0);
            
                    return {
                        user_id: user.id,
                        username: user.username,
                        email: user.email,
                        token_added: totalAdded,
                        token_used: totalUsed,
                        token_available: totalAdded - totalUsed
                    };
                });
            
                data = userList;
            }
            break;
            
            case "token:devChart": {
                await authMiddleware(req, ['dev']);
            
                const allUsedTokens = await Token.findAll({
                    where: { is_added: false },
                    attributes: ['amount', 'createdAt']
                });

                const dailyUsageMap = {};

                for (let token of allUsedTokens) {
                    const dateStr = new Date(token.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
                    dailyUsageMap[dateStr] = (dailyUsageMap[dateStr] || 0) + (token.amount || 0);
                }

                const chartData = Object.entries(dailyUsageMap).map(([date, token]) => ({
                    date,
                    token
                }));
            
                data = chartData;
            }
            break;

            default:
                throw new Error("API tidak ada! (404)");
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