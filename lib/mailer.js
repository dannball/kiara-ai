const nodemailer = require('nodemailer');

exports.kirimPesan = async function kirimPesan(email, judul, pesan) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASS,
        }
    });
    const info = await transporter.sendMail({
        to: email,
        subject: judul,
        text: pesan,
    })
    return info;
}