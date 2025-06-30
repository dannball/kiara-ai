const { Op } = require("sequelize");
const { Auth, User } = require("../../database");

async function authMiddleware(req, allowedRoles = []) {
      const authKey = (req.headers["authorization"] || "").replace("Bearer ", "");
      const userAgent = req.headers["user-agent"] || "";

      if (!authKey) {
        throw new Error("Unauthorized Missing auth key (401)");
      }

      const session = await Auth.findOne({
        where: {
          key: authKey,
          expired_time: { [Op.gt]: Date.now() }
        },
        include: [{
          model: User,
          attributes: ["id", "username", "email", "role", "is_verify"]
        }]
      });

      if (!session || !session.user) {
        throw new Error("Unauthorized Invalid session (401)");
      }

      const validity = JSON.parse(session.validity_data || "{}");
      if (validity.useragent !== userAgent) {
        throw new Error("Unauthorized User-Agent mismatch (401)");
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
        throw new Error("Forbidden: not allowed (403)");
      }

      req.user = session.user;
      return !0;
}

module.exports = authMiddleware;
