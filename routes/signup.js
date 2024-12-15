const express = require('express');
const router = express.Router();
const maxageTimeForUserId = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months


// Render the signup page
router.get('/', (req, res) => {
    res.render('signup', { nonce: res.locals.nonce });
});

//add user into database
router.post('/signup', async (req, res) => {

    const { user, fullName, email, phone, streetAddress, city, pincode, hashedPassword } = req.body;

    const userId = user.uid;

    let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
    let validateNumberInput = (input, length) => typeof input === 'string' && /^\d+$/.test(input) && input.length === length;
    let validateEmail = (input) => typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

    if (
        !validateInput(fullName) ||
        !validateEmail(email) ||
        !validateNumberInput(phone, 10) ||
        !validateInput(streetAddress) ||
        !validateInput(city) ||
        !validateNumberInput(pincode, 6)
    ) {
        return res.json({ type: 'negative', message: 'Invalid input values.' });
    }

    res.cookie('userId', userId, {
        maxAge: maxageTimeForUserId,
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
        sameSite: 'Strict'
    });

    let userFormData = { fullName, email, phone, streetAddress, city, pincode, password: hashedPassword, dateTime: new Date() };
    console.log(userFormData + userId);

    // Reference to the user in Firestore
    const userRef = req.firestore.collection('users').doc(userId);
    try {
        await userRef.set(userFormData);
    } catch (error) {
        console.error('User not added to database:', error);
        return res.json({ message: 'User not added to database. Please try again.', type: 'negative' });
    }

});

module.exports = router;
