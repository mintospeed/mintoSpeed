const express = require('express');
const router = express.Router();
const validateUser = require('../middlewares/validateUser');
const { timestampIntoString } = require('../utilities/dateTime');

const setCartCookie = require('../middlewares/cartCookie');


router.get('/', validateUser, setCartCookie, async (req, res) => {
    let userId = req.userId;
    let totalCartItem = req.totalCart || 0;;
    const signedUser = req.cookies.userId ? 'true' : 'false';
    

    // If no user ID or temp ID, return empty cart
    if (!userId) {
        return res.render('track', { nonce: res.locals.nonce, activePage: 'track', user: signedUser, totalCart: totalCartItem });
    }

    return res.render('track', { nonce: res.locals.nonce, activePage: 'track', user: signedUser, totalCart: totalCartItem });
});


//return order data by orderid
router.post('/submit', validateUser, async (req, res) => {
    let orderId  = req.body.orderId;
    let userId = req.userId;
    const regex = /^[a-zA-Z0-9]+$/;     //allow only alphabets and numbers
    let tr;

    // if(!userId){
    //     return res.json({ message: 'Please sign in to track your order.', type: 'negative' });
    // }

    if (orderId === "") {
        return res.json({ message: 'Please enter your order ID.', type: 'negative' });
    }
     else if (!regex.test(orderId)) {
        return res.json({ message: 'Invalid order ID! Only alphabets and numbers are allowed..', type: 'negative' });
    }
     else if (orderId.length != 10) {
        return res.json({ message: 'Invalid order ID! Order Id should be of 10 characters.', type: 'negative' });
    }



    try {
        const userRef = req.firestore.collection("order").doc(orderId);
    
        const doc = await userRef.get();

        if(!doc.exists){
            return res.json({ message: `Order not found for order ID - ${orderId}`, type: 'negative' });
        }
            tr = {
                orderId: doc.id,
                orderTime: timestampIntoString(doc.data().dateTime),
                deliveryTime: timestampIntoString(doc.data().deliveryTime),
                orderTotalItems: doc.data().orderTotalItems,
                orderTotalPrice: doc.data().orderTotalPrice,
                orderStatus: doc.data().orderStatus
            }
          
    
    
    } catch (error) {
        console.error('Order not found in the database:', error); // Log the error for debugging
        return res.json({ message: 'Something went wrong. Please try again..', type: 'negative' });
    }

    return res.json({ message: 'Order found.', type: 'positive', orderData: tr });

});



module.exports = router;