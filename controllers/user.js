const { User } = require('../database');
const { kirimPesan } = require('../lib/mailer');
const authMiddleware = require('../lib/middlewares/auth');
const bcrypt = require('bcrypt');

const resetPasswordStore = new Map();

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

            case 'user:me': {
                await authMiddleware(req);
                const userId = req.user?.id;
                if (!userId) throw "User tidak login!";
                const user = await User.findByPk(userId, {
                  attributes: ['id', 'username', 'email', 'role', 'sender', 'is_verify']
                });
                if (!user) throw new Error('User tidak ditemukan! (404)');
                data = user;
              } break;
        
              case 'user:update': {
                await authMiddleware(req);
                const userId = req.user?.id;
                if (!userId) throw "User tidak login!";
                const user = await User.findByPk(userId);
                if (!user) throw new Error('User tidak ditemukan! (404)');
        
                const { username, password, whatsapp } = body;

                if (username && (username.length < 3 || username.length > 22)) {
                  throw new Error('Username harus 3-22 karakter! (400)');
                }
        
                if (username) user.username = username;
                if (sender) user.sender = whatsapp;
        
                if (password) {
                  const salt = await bcrypt.genSalt(10);
                  user.password = await bcrypt.hash(password, salt);
                }
        
                await user.save();
                data = { updated: true };
              } break;

              case 'user:forgotPassword': {
                const { email } = body;
                if (!email) throw new Error('Email tidak boleh kosong! (400)');
        
                const user = await User.findOne({ where: { email } });
                if (!user) throw new Error('Email tidak terdaftar! (404)');
        
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expired = Date.now() + 15 * 60 * 1000; // 15 menit
        
                resetPasswordStore.set(email, { otp, expired });
        
                await kirimPesan(email, 'Reset Password KIARA', `Kode reset password Anda: ${otp}`);
                data = { message: 'Kode reset telah dikirim ke email Anda' };
              } break;
        
              case 'user:verifyReset': {
                const { email, otp } = body;
                const record = resetPasswordStore.get(email);
        
                if (!record || record.otp !== otp || Date.now() > record.expired) {
                  throw new Error('Kode OTP tidak valid atau telah kedaluwarsa! (400)');
                }
        
                data = { verified: true };
              } break;
        
              case 'user:resetPassword': {
                const { email, otp, newPassword } = body;
                const record = resetPasswordStore.get(email);
        
                if (!record || record.otp !== otp || Date.now() > record.expired) {
                  throw new Error('Kode OTP tidak valid atau telah kedaluwarsa! (400)');
                }
        
                const user = await User.findOne({ where: { email } });
                if (!user) throw new Error('User tidak ditemukan! (404)');
        
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(newPassword, salt);
                await user.save();
        
                resetPasswordStore.delete(email);
                data = { message: 'Password berhasil diperbarui!' };
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