const { User, Schedule } = require('../database');
const authMiddleware = require('../lib/middlewares/auth');

module.exports = async (req, res, next) => {
    try {
        let { params, body } = req;
        if (!body) return next();
        let command = `${params.type}:${params.cmd}`;
        let data = null;

        switch (command) {

              case 'schedule:list': {
                await authMiddleware(req, ['user']);
                const user = req.user;
                const { title, startDate, endDate } = body;
        
                const where = { user_id: user.id, is_deleted: false };
                if (title) where.title = { [Op.like]: `%${title}%` };
                if (startDate && endDate) where.date = { [Op.between]: [new Date(startDate), new Date(endDate)] };

                data = await Schedule.findAll({ where, attributes: { exclude: ['response_ai'] } });
              } break;

              case 'schedule:update': {
                await authMiddleware(req, ['user']);
                const user = req.user;
                const { id, title, activity, date } = body;
                const schedule = await Schedule.findOne({ where: { id, user_id: user.id, is_deleted: false }, attributes: { exclude: ["response_ai"] } });
                if (!schedule) throw new Error('Schedule tidak ditemukan');

                Object.assign(schedule, { title, activity, date });
                await schedule.save();
                data = schedule;
              } break;

              case 'schedule:delete': {
                await authMiddleware(req, ['user']);
                const user = req.user;
                const { id } = body;
                const schedule = await Schedule.findOne({ where: { id, user_id: user.id, is_deleted: false } });
                if (!schedule) throw new Error('Schedule tidak ditemukan');

                schedule.is_deleted = true;
                await schedule.save();
                data = { deleted: true };
              } break;

              case 'schedule:devList': {
                await authMiddleware(req, ['dev']);
                const { username, title, startDate, endDate } = body;
                const where = { is_deleted: false };
                const include = [{ model: User, attributes: ['id', 'username'] }];
        
                if (title) where.title = { [Op.like]: `%${title}%` };
                if (startDate && endDate) where.date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
                if (username) include[0].where = { username };

                data = await Schedule.findAll({ where, include });
              } break;

              case 'schedule:chart': {
                await authMiddleware(req, ['dev']);
                const { startDate, endDate } = body;
                const where = {};
                if (startDate && endDate) where.date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        
                const total = await Schedule.count({ where });
                const reminded = await Schedule.count({ where: { ...where, is_reminded: true } });
                const notReminded = total - reminded;

                data = { total, reminded, notReminded };
              } break;

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