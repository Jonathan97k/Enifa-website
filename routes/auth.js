const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    const user = await AdminUser.findOne({ username: String(username).trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Incorrect username or password.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Incorrect username or password.' });

    const token = jwt.sign(
        { sub: user._id.toString(), username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie(COOKIE_NAME, token, cookieOpts);
    res.json({ ok: true, username: user.username, displayName: user.displayName || user.username });
});

router.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
    const user = await AdminUser.findById(req.user.sub).select('username displayName');
    if (!user) return res.status(401).json({ error: 'Not logged in.' });
    res.json({ username: user.username, displayName: user.displayName || user.username });
});

router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const user = await AdminUser.findById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'Not logged in.' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ ok: true });
});

module.exports = router;
