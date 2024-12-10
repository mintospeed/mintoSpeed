const express = require('express');
const router = express.Router();
const { generateUniqueId } = require('../utilities/utility');
const setCartCookie = require('../middlewares/cartCookie');

router.get('/',setCartCookie, async (req, res) => {
    const signedUser = req.cookies.userId ? 'true' : 'false';

    return res.render('feedback', { nonce: res.locals.nonce, activePage: 'feedback', user: signedUser });
});


//store feedback to database
router.post('/submit', async (req, res) => {
    let { email, rating, feedback } = req.body;
    let userId = req.cookies.userId;
    let feedbackData = {};

    let validateNumberInput = (input, length) => typeof input === 'string' && /^\d+$/.test(input) && input.length === length;

    if (!email == null) {
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.json({ message: `Email is not valid.`, type: 'negative' });
        }
        email = email.toLowerCase();
    }
    if (/[#\[\]<>]/.test(feedback) || feedback.length < 1) {
        return res.json({ message: 'Blank or Input contains invalid characters like #, [, ], < or >.', type: 'negative' });
    }
    if (!validateNumberInput(rating, 1)) return res.json({ message: 'Please select a rating star.', type: 'negative' });

    if (feedback.length > 5000) {
        return res.json({ message: 'Please write feedback within 5000 characters.', type: 'negative' });
    }


    if (!userId) {
        feedbackData = {
            email: email,
            reason: selectedOption,
            detail: feedback,
            dateTime: new Date()
        };
    }
    else if (userId) {
        feedbackData = {
            userId: userId,
            reason: selectedOption,
            detail: feedback,
            dateTime: new Date()
        };
    }

    const feedbackId = generateUniqueId(16);

    try {
        await req.firestore.collection('feedback').doc(feedbackId).set(feedbackData);
        console.log("feedbackData saved with ID: ", feedbackId);

        return res.json({ message: `Feedback Submitted.`, type: 'positive' });

    } catch (error) {
        console.error("Error saving feedbackData: ", error);
        return res.json({ message: `Something went wrong to submit the feedback. Please try again.`, type: 'negative' });
    }
});


module.exports = router;