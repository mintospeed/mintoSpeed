const express = require('express');
const bcrypt = require('bcryptjs');
const admin = require("firebase-admin");
const verifyRecaptcha = require('../middlewares/verifyRecaptcha');


const router = express.Router();
const maxageTimeForUserId = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
const maxageTimeForUserIdDelete = 1 * 1000; // 1 minute

// Render the signup page
router.get('/', (req, res) => {
    res.render('signup', { nonce: res.locals.nonce });
});
router.get('/login', (req, res) => {
    res.render('login', { nonce: res.locals.nonce });
});

//add user into database
router.post('/signup', async (req, res) => {
    let { user, fullName, email, streetAddress, city, pincode, hashedPassword } = req.body;

    const userId = user.uid;
    const phone = user.phoneNumber;
    console.log("signup begain : " + user + fullName + email + phone + streetAddress + city + pincode + hashedPassword);

    const hashedPassword1 = await hashPassword(hashedPassword);


    let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
    let validateNumberInput = (input, length) => typeof input === 'string' && /^\d+$/.test(input) && input.length === length;
    let validateEmail = (input) => typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

    if (
        !validateInput(fullName) ||
        !validateEmail(email) ||
        !validateInput(streetAddress) ||
        !validateInput(city) ||
        !validateNumberInput(pincode, 6)
    ) {
        return res.json({ type: 'negative', message: 'Invalid input values.' });
    }

    res.cookie('userId', userId, {
        maxAge: maxageTimeForUserId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
        sameSite: 'Strict'
    });

    let userFormData = { fullName: convertToLowercase(fullName), email, phone, streetAddress: convertToLowercase(streetAddress), city: convertToLowercase(city), pincode, password: hashedPassword1, dateTime: new Date() };
    console.log(userFormData + userId);

    // Reference to the user in Firestore
    const userRef = req.firestore.collection('users').doc(userId);
    try {
        await userRef.set(userFormData);
        // return res.redirect('/profile');
        return res.json({ message: 'Account created.', type: 'positive' });
    } catch (error) {
        console.error('User not added to database:', error);
        return res.json({ message: 'Something went wrong to create account. Please try again.', type: 'negative' });
    }

});

router.post('/logout', async (req, res) => {
    res.cookie('userId', "", {
        maxAge: maxageTimeForUserIdDelete,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
        sameSite: 'Strict'
    });
    res.cookie('totalCart', "", {
        maxAge: maxageTimeForUserIdDelete,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
        sameSite: 'Strict'
    });
    return res.json({ message: '', type: 'positive' });
});


router.post('/login', verifyRecaptcha, async (req, res) => {
    let { phone, hashedPassword } = req.body;
    const captchaScore = req.captchaScore;
    console.log("captchaScore : " + captchaScore);

    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        return res.json({ message: 'Invalid phone number.', type: 'negative' });
    }

    if (!phone.startsWith('+91')) {
        phone = '+91' + phone;
    }

    try {
        const userRecord = await admin.auth().getUserByPhoneNumber(phone);

        console.log("User found:", userRecord.toJSON());
        if (userRecord.phoneNumber) {
            console.log("Phone number is verified:", userRecord.phoneNumber);
            const userId = userRecord.uid;
            console.log("userid : " + userId);

            const userRef = req.firestore.collection('users').doc(userId);
            try {
                const userData = await userRef.get();
                if (userData.exists) {
                    const dbPassword = userData.data().password;
                    const isPasswordValid = await verifyPassword(dbPassword, hashedPassword);
                    if (isPasswordValid) {
                        res.cookie('userId', userId, {
                            maxAge: maxageTimeForUserId,
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
                            sameSite: 'Strict'
                        });
                        return res.json({ message: 'Login successfull.', type: 'positive' });
                    }
                    else {
                        return res.json({ message: 'Password not matched.', type: 'negative' });
                    }
                }
                else {
                    return res.json({ message: 'User data not found. Create account with same phone number if issue persist.', type: 'negative' });
                }
            }
            catch (err) {
                return res.json({ message: 'Something went wrong. Try again.', type: 'negative' });
            }
        } else {
            return res.json({ message: 'Phone number does not exit.', type: 'negative' });
        }

    } catch (err) {
        return res.json({ message: 'Something went wrong. Try again.', type: 'negative' });
    }
});


// Function to hash the password
async function hashPassword(plainPassword) {
    const saltRounds = 7; // Adjust for desired security and performance
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
}
// Function to verify password
async function verifyPassword(plainPassword, hashedPassword) {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
}
function convertToLowercase(input) {
    return input.toLowerCase();
}

module.exports = router;

