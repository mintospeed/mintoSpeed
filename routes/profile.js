const express = require('express');
const router = express.Router();
const { getTotalCartItems } = require('../databaseQuery/getTotalCartNumber');
const { timestampIntoString } = require('../utilities/dateTime');
const { parse } = require('date-fns');

const setCartCookie = require('../middlewares/cartCookie');
const maxageTime = 12 * 60 * 60 * 1000; //12 hours


router.get('/',setCartCookie, async (req, res) => {
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let totalCartItem = req.totalCart || 0;;
    let userData = {};
    let pendingOrders = [];
    let lastVisible = null; // Initialize a variable to store the last document


    // If no user ID or temp ID, return empty cart
    if (!userId && !tempId) {
        return res.status(404).json({ error: 'No user found' });
    } else if (!userId && tempId) {
        return res.status(404).json({ error: 'No user found' });
    }

    //user detail
    try {
        const userRef = req.firestore.collection('users').doc(userId);
        const userSnapshot = await userRef.get();

        userData = userSnapshot.data();
        console.log("userData " + userData);

    } catch (error) {
        console.error('User not found to database:', error); // Log the error for debugging
        return res.status(404).json({ error: 'No user found' });
    }


    //pending order detail
    try {
            try {
              
                let query = req.firestore
                .collection('orderByUserId')
                .doc(userId)
                .collection('orders')
                .where('status', '==', 'pending')
                .orderBy("orderTime", "desc")
                .limit(50);
                                

                const querySnapshot = await query.get();
                // Get the last document for the next pagination
                // lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

                querySnapshot.forEach((doc) => {
                    pendingOrders.push({
                        orderId: doc.id,
                        orderTime: timestampIntoString(doc.data().orderTime),
                        deliveryTime: timestampIntoString(doc.data().deliveryTime),
                        status: doc.data().status,
                        totalItems: doc.data().totalItems,
                        totalPrice: doc.data().totalPrice
                    });
                   
                });


            } catch (error) {
                console.error("Error fetching pendign orders:", error);
            }
        
            console.log("Pending orders (newest first):", pendingOrders);
            return res.render('profile', { nonce: res.locals.nonce, activePage: 'profile', user: "true", userData: userData, totalCart: totalCartItem, pendingOrders: pendingOrders });

    } catch (error) {
        console.error("Error retrieving orders:", error);
        return res.render('profile', { nonce: res.locals.nonce, activePage: 'profile', user: "true", userData: userData, totalCart: totalCartItem });
    }
});




module.exports = router;