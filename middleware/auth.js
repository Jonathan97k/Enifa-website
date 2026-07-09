const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'enifa_session';

function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Please log in.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.clearCookie(COOKIE_NAME);
        return res.status(401).json({ error: 'Your session expired. Please log in again.' });
    }
}

module.exports = { requireAuth, COOKIE_NAME };
