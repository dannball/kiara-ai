const { Op } = require('sequelize');
const { User, Auth, Verify } = require('../database');
const bcrypt = require('bcrypt');
const { kirimPesan } = require('../lib/mailer');
const authMiddleware = require('../lib/middlewares/auth');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

            case "auth:verify": {
                await authMiddleware(req);
                let { otp } = body;
                if (!otp || otp.length !== 6) throw new Error("OTP tidak valid!");
                if (!req.user) throw new Error("User tidak ditemukan!"); 
                let user = req.user;
                if (!user.email) throw new Error("Email tidak boleh kosong!");

                if (user.is_verify) throw new Error("Email sudah diverifikasi!");

                const resultOtp = await Verify.findOne({
                    where: {
                        code: otp,
                        user_id: user.id,
                        expired_time: {
                            [Op.gt]: new Date()
                        }
                    }
                });
                
                if (!resultOtp) throw new Error("OTP salah atau telah kedaluwarsa!");
                
                user = await User.findOne({ where: { id: user.id }, attributes: ["id", "is_verify"] });
                user.is_verify = true;
                await user.save();

                await Verify.destroy({ where: { user_id: user.id } });            
                data = { is_verify: true };
            }
            break;

            case "auth:login": {
                const useragent = req.headers['user-agent'];
                let { username, password } = body;

                if (!username) throw new Error("Masukkan username!");
                if (!password) throw new Error("Masukkan password!");

                const user = await User.findOne({ where: { username }, attributes: ['id', 'username', 'password', 'email', 'is_verify'] });
                if (!user) throw new Error('Username atau password salah');

                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) throw new Error('Username atau password salah');

                // Jika email belum diverifikasi
                if (!user.is_verify) {
                    const code = generateOTP();
                    const expired_time = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

                    // Simpan atau update kode verifikasi
                    await Verify.upsert({
                        user_id: user.id,
                        code,
                        expired_time
                    });

                    // Kirim email kode verifikasi (asumsikan kamu punya function kirimEmail)
                    await kirimPesan(user.email, "Kode Verifikasi Akun", `Kode verifikasi kamu adalah: ${code}. Berlaku selama 15 menit.`);
                }

                // Lanjut login
                let auth = await Auth.findOne({
                    where: {
                        user_id: user.id,
                        expired_time: { [Op.gt]: Date.now() }
                    },
                    attributes: ["id", "key", "validity_data"]
                });

                const dataSession = JSON.parse(auth?.validity_data ?? '{}');
                if (auth && dataSession.useragent === useragent) {
                    data = auth.key;
                    return;
                }

                auth = await Auth.create({
                    key: generateRandomId(192),
                    expired_time: Date.now() + (1 * 24 * 60 * 60 * 1000),
                    user_id: user.id,
                    validity_data: JSON.stringify({ useragent })
                });

                data = { auth: auth.key, is_verify: user.is_verify };

                function generateRandomId(length) {
                    return `KIARA_${Math.random().toString(36).substring(2, length + 90)}`;
                }

                function generateOTP() {
                    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
                }
            } break;


            case "auth:register": {
                let { username, password, email, confirmPassword } = body;
            
                // Validasi username
                if (!username) throw new Error("Masukkan username!");
                if (username.length < 3 || username.length > 22) throw new Error("Username minimal 3 karakter dan maksimal 22 karakter!");
            
                // Validasi email
                if (!email) throw new Error("Masukkan email!");
                let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) throw new Error("Format email tidak valid!");
            
                // Validasi password
                if (!password) throw new Error("Masukkan password!");
                if (password.length < 6) throw new Error("Password minimal 6 karakter!");
                if (password !== confirmPassword) throw new Error("Konfirmasi password tidak cocok!");
            
                // Cek username sudah dipakai
                let usernameFind = await User.findOne({ where: { username }, attributes: ['id'] });
                if (usernameFind) throw new Error("Username telah digunakan!");
            
                // Cek email sudah dipakai
                let emailFind = await User.findOne({ where: { email }, attributes: ['id'] });
                if (emailFind) throw new Error("Email telah digunakan!");
            
                // Hash password dan buat user
                let salt = await bcrypt.genSalt(10);
                let hashPassword = await bcrypt.hash(password, salt);
                let user = await User.create({ username, password: hashPassword, email });
                data = user.id; // sebagai response
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