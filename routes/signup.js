const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.get('/', (req, res) => {
    res.render('signup', {nonce: res.locals.nonce});
});


// Route to receive verified user details
router.post('/verify-code', async (req, res) => {
    const { phoneNumber, uid } = req.body;

    try {
        // Verify the user exists in Firebase Auth
        const userRecord = await admin.auth().getUser(uid);

        if (userRecord.phoneNumber === phoneNumber) {
            res.status(200).json({ success: true, message: 'Phone number verified successfully!' });
        } else {
            res.status(400).json({ success: false, message: 'Phone number mismatch.' });
        }
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ success: false, message: 'Failed to verify user.' });
    }
});

module.exports = router;
