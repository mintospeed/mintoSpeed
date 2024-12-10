const express = require('express');
const router = express.Router();
const complaintSubmitUser = require('../controllers/complaintSubmitUser');
const complaintSubmitAgent = require('../controllers/complaintSubmitAgent');
const { generateUniqueId } = require('../utilities/utility');
const setCartCookie = require('../middlewares/cartCookie');


router.get('/',setCartCookie, async (req, res) => {
    let totalCartItem = req.totalCart || 0;
    const signedUser = req.cookies.userId ? 'true' : 'false';

    return res.render('complaint', { nonce: res.locals.nonce, activePage: 'complaint', user: signedUser, totalCart: totalCartItem });
});


//store complaint to database
router.post('/submit', async (req, res) => {
    let { email, selectedOption, feedback } = req.body;
    let userId = req.cookies.userId;
    let complaintData = {};
    let userEmail = email;


    const isValidString = (str) => typeof str === 'string' && /^[a-zA-Z0-9_\- &]+$/.test(str);

    if (!email == null) {
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.json({ message: `Email is not valid.`, type: 'negative' });
        }
        email = email.toLowerCase();
    }
    if (/[#\[\]<>]/.test(feedback) || feedback.length < 1) {
        return res.json({ message: 'Blank or Input contains harmful characters like #, [, ], < or >.', type: 'negative' });
    }
    if (!isValidString(selectedOption)) return res.json({ message: 'Please select an option.', type: 'negative' });

    if (feedback.length > 5000) {
        return res.json({ message: 'Please write complaint within 5000 characters.', type: 'negative' });
    }


    if (!userId) {
        complaintData = {
            email: email,
            reason: selectedOption,
            detail: feedback,
            dateTime: new Date()
        };
        userEmail = email;
    }
    else if (userId) {
        complaintData = {
            userId: userId,
            reason: selectedOption,
            detail: feedback,
            dateTime: new Date()
        };


        try {
            const userRef = req.firestore.collection('users').doc(userId);
            const userSnapshot = await userRef.get();

            userEmail = userSnapshot.data().email;
            console.log("userEmail " + userEmail);

        } catch (error) {
            console.error('User not found to database:', error); // Log the error for debugging
            return res.json({ message: 'User not found. Please try again.', type: 'negative' });
        }
    }

    const complaintId = generateUniqueId(15);

    try {
        await req.firestore.collection('complaint').doc(complaintId).set(complaintData);
        console.log("complaintData saved with ID: ", complaintId);

        //send submit email to agent
        complaintSubmitAgent.complaintSubmit(complaintData, userEmail, complaintId)
            .then(() => {
                console.log("Complaint email sent to agent.");
            })
            .catch((error) => {
                console.error(" Complaint Email error :" + error);
            });
        //send submit email to user
        complaintSubmitUser.complaintSubmit(complaintData, userEmail, complaintId)
            .then(() => {
                console.log("Complaint email sent to user.");
            })
            .catch((error) => {
                console.error(" Complaint Email error :" + error);
            });


        return res.json({ message: `Complaint Submitted.`, type: 'positive' });

    } catch (error) {
        console.error("Error saving complaintData: ", error);
        return res.json({ message: `Something went wrong to submit the complaint. Please try again.`, type: 'negative' });
    }
});


module.exports = router;