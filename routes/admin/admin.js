const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/keys.js');

const router = express.Router();

router.get('/', async (req, res) => {
return res.render('admin/adminLogin', { nonce: res.locals.nonce, activePage: 'admin Login' });
});


// Admin login route
router.post('/login', (req, res) => {
    const adminCredentials = {
        username: process.env.ADMIN_ID,
        password: process.env.ADMIN_PASSWORD,
    };

    const { username, password } = req.body;

    if (username === adminCredentials.username && password === adminCredentials.password) {
        const token = jwt.sign({ username, role: 'admin' }, jwtSecret, { expiresIn: '24h' });

        res.cookie('authToken', token, {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',  // Uncomment if needed
            sameSite: 'Strict'
        });
        return res.json({ type: 'positive', message: 'Login successful.' });
    }
    return res.json({ type: 'negative', message: 'Invalid input' });
});


module.exports = router;


