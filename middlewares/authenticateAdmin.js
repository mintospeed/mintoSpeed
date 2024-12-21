const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/keys.js');


module.exports = (req, res, next) => {
    const authHeader = req.cookies.authToken;

    console.log('Authorization Header:', authHeader); // Log the header

    if (!authHeader) {
        console.log("checking authHeader");
        return res.status(403).send('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[0]; // Extract the token part
    if (!token) {
        return res.status(403).send('Access denied. No token provided..');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret); // Verify the token
        console.log('Decoded Token:', decoded); // Log the decoded payload

        if (decoded.role !== 'admin') {
            return res.status(403).send('Access denied. Not authorized.');
        }

        req.admin = decoded; // Attach token info to request
        console.log('Middleware passed, calling next()');
        next();
        return;
    } catch (error) {
        console.error('Token verification failed:', error.message); // Log errors
        return res.status(403).send('Invalid token.');
    }
};

