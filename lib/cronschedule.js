const { Op } = require("sequelize");
const { Schedule, User } = require("../database");

async function scheduleJob() {
  const nowJakarta = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const earlyTarget = new Date(nowJakarta.getTime() + 30 * 60 * 1000);

  const earlyStart = new Date(Date.UTC(
    earlyTarget.getFullYear(),
    earlyTarget.getMonth(),
    earlyTarget.getDate(),
    earlyTarget.getHours(),
    earlyTarget.getMinutes(),
    0
  ));
  const earlyEnd = new Date(earlyStart.getTime() + 59_999);

  const earlyReminders = await Schedule.findAll({
    where: {
      is_deleted: false,
      is_reminded_early: false,
      date: { [Op.between]: [earlyStart, earlyEnd] }
    },
    include: [{ model: User, attributes: ['sender', 'id'] }]
  });

  for (const schedule of earlyReminders) {
    let conn = dann[schedule.system_id]?.conn;
    if (!conn?.ws?.socket) continue;
    await conn.sendMessage(schedule.user.sender, { text: `⏳ [REMINDER AWAL] 30 menit lagi: ${schedule.activity}` });

    schedule.is_reminded_early = true;
    await schedule.save();
  }

  const currentStart = new Date(Date.UTC(
    nowJakarta.getFullYear(),
    nowJakarta.getMonth(),
    nowJakarta.getDate(),
    nowJakarta.getHours(),
    nowJakarta.getMinutes(),
    0
  ));
  const currentEnd = new Date(currentStart.getTime() + 59_999);

  const finalReminders = await Schedule.findAll({
    where: {
      is_deleted: false,
      is_reminded: false,
      date: { [Op.between]: [currentStart, currentEnd] }
    }
  });

  for (const schedule of finalReminders) {
    let conn = dann[schedule.system_id]?.conn;
    if (!conn?.ws?.socket) continue;
    await conn.sendMessage(schedule.user.sender, { text: `🔔 [REMINDER SAATNYA] Sekarang waktunya: ${schedule.activity}` });

    schedule.is_reminded = true;
    await schedule.save();
  }
}

module.exports = { scheduleJob };
