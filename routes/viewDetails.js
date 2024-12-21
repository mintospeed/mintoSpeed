const express = require('express');
const { timestampIntoString } = require('../utilities/dateTime');
const validateUser = require('../middlewares/validateUser');


const router = express.Router();

// Admin dashboard (protected route)
router.get('/', validateUser, async (req, res) => {
    const detailedOrders = [];
    const orderId = req.query.orderId;

    let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
    if(!validateInput(orderId)){
        return res.render('viewDetails', {
            nonce: res.locals.nonce,
            activePage: 'detail order',
        });
    }

    try {
        const orderDoc = await req.firestore.collection("order").doc(orderId).get();
        if (orderDoc.exists) {
            const orderData = orderDoc.data();
            detailedOrders.push({
                orderId,
                orderTime: timestampIntoString(orderData.dateTime),
                deliverTime: timestampIntoString(orderData.deliveryTime) || '',
                ...orderData,
            });

        } else {
            console.log(`Order ${orderId} not found in Firestore, `);
            return res.render('viewDetails', {
                nonce: res.locals.nonce,
                activePage: 'detail order',
            });
        }
    } catch (firestoreError) {
        console.error(`Error fetching Firestore details for order ${orderId}:`, firestoreError);
        return res.render('viewDetails', {
            nonce: res.locals.nonce,
            activePage: 'detail order',
        });
    }
    console.log(detailedOrders);

    return res.render('viewDetails', {
        nonce: res.locals.nonce,
        activePage: 'detail order',
        orders: detailedOrders,
    });

});



module.exports = router;