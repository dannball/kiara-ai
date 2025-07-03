const { Voucher, UserVoucher } = require('../database');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

            case 'package:findAll': {
                data = await Package.findAll({ order: [['id', 'DESC']] });
              } break;

              case 'package:create': {
                await authMiddleware(req, ['dev']);
                const { token, price, title, description } = body;
        
                if (!token || !price || !title) throw new Error("Data tidak lengkap! (400)");
                data = await Package.create({ token, price, title, description });
              } break;

              case 'package:update': {
                await authMiddleware(req, ['dev']);
                const { id, token, price, title, description } = body;
                if (!id) throw new Error("ID diperlukan! (400)");
        
                const pkg = await Package.findByPk(id);
                if (!pkg) throw new Error("Package tidak ditemukan! (404)");
        
                if (token !== undefined) pkg.token = token;
                if (price !== undefined) pkg.price = price;
                if (title !== undefined) pkg.title = title;
                if (description !== undefined) pkg.description = description;

                await pkg.save();
                data = { message: 'Package berhasil diupdate' };
              } break;

              case 'package:delete': {
                await authMiddleware(req, ['dev']);
                const { id } = body;
                if (!id) throw new Error("ID diperlukan! (400)");
        
                const pkg = await Package.findByPk(id);
                if (!pkg) throw new Error("Package tidak ditemukan! (404)");

                await pkg.destroy();
                data = { message: 'Package berhasil dihapus' };
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
        console.log(error);
    }
}