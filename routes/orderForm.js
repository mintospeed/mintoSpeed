const express = require('express');
const router = express.Router();
const orderFormSubmitUser = require('../controllers/orderFormSubmitUser');
const orderFormSubmitAgent = require('../controllers/orderFormSubmitAgent');

const { generateUniqueId, getClosestWeightAndPrice } = require('../utilities/utility');
const { dateTimeForRealTimeDatabase } = require('../utilities/dateTime');
const maxageTime = 12 * 60 * 60 * 1000; //12 hours
const { getTotalCartItems } = require('../databaseQuery/getTotalCartNumber');
const maxageTimeForUserId = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months


// Serve the main page (index.ejs)
router.get('/', async (req, res) => {
    const orderId = req.query.tempOrderId;
    console.log("order id : " + orderId);

    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let userData = {};
if (!userId && tempId) {
        userId = tempId;
    }

    const signedUser = req.cookies.userId ? 'true' : 'false';


    let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
    if(!validateInput(orderId)){
        return res.render('orderForm', { nonce: res.locals.nonce, activePage: 'orderForm', user: signedUser });
    }

    try {
        // Define the path to the specific order in the database
        const orderRef = req.database.ref(`tempOrder/${orderId}`);
        const snapshot = await orderRef.get();

        if (snapshot.exists) {
            const tempOrderData = snapshot.val();
            console.log('Order Data:', tempOrderData);

            // Reference to the user in Firestore
            const userRef = req.firestore.collection('users').doc(userId);
            let userSnapshot;
            try {
                userSnapshot = await userRef.get();
            } catch (error) {
                console.error('Error userSnapshot:', error);
            }
            userData = userSnapshot.data();


            return res.render('orderForm', { nonce: res.locals.nonce, activePage: 'orderForm', user: signedUser, totalItems: tempOrderData.totalItems, totalPrice: tempOrderData.totalPrice, orderId: orderId, userData });
        } else {
            console.log('No data available for the specified order ID.');
            return res.render('orderForm', { nonce: res.locals.nonce, activePage: 'orderForm', user: signedUser, flag: 'false' });
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        return res.render('orderForm', { nonce: res.locals.nonce, activePage: 'orderForm', user: signedUser });
    }
});


//store order data into database
router.post('/order', async (req, res) => {
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let userData = {};
    let errorForAdmin = [];
    let logsForAdmin = [];

    let tempUser;
    let signedUser = 'false';

    if (userId) {
        signedUser = 'true';
    }

    if (!userId && !tempId) {
        totalCartItem = 0
    }
    else if (!userId && tempId) {
        userId = tempId;
        tempUser = true;
    }


    try {
        const { fullName, email,  phone, streetAddress, city, pincode, orderId, paymentMode } = req.body;

        let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
        let validateNumberInput = (input, length) => typeof input === 'string' && /^\d+$/.test(input) && input.length === length;
        let validateEmail = (input) => typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        let validatePaymentMode = (input) => {
            return typeof input === 'string' && ['online', 'cod'].includes(input.toLowerCase());
        };

        // Validating each field
        if (
            !validateInput(fullName) ||
            !validateEmail(email) ||
            // !validateNumberInput(emailOtp, 6) ||
            !validateNumberInput(phone, 10) ||
            // !validateNumberInput(phoneOtp, 6) ||
            !validateInput(streetAddress) ||
            !validateInput(city) ||
            !validateInput(orderId) ||
            !validateNumberInput(pincode, 6) ||
            // !validateInput(district) ||
            // !validateInput(state) ||
            !validatePaymentMode(paymentMode)
        ) {
            return res.json({ type: 'negative', message: 'Invalid input' });
        }

        let userFormData = { fullName, email, phone, streetAddress, city, pincode, dateTime: new Date() };
        console.log("oderform userFormData");
        console.log(userFormData);
        
        // Reference to the user in Firestore
        const userRef = req.firestore.collection('users').doc(userId);
        const userSnapshot = await userRef.get();

        //if user is not found in users collection then create one
        if (!userSnapshot.exists) {
            console.log('User not found.');
            const userRef = req.firestore.collection('users').doc(userId);
            try {
                await userRef.set(userFormData);
                logsForAdmin.push("New User.");
            } catch (error) {
                console.error('User not added to database:', error);
                errorForAdmin.push("New User data not added in firestore users collection.");
                return res.json({ message: 'User not added to database. Please try again.', type: 'negative' });
            }
            tempUser = true;
        }
        else {
            tempUser = false;
        }

        const tempOrderRef = req.database.ref(`tempOrder/${orderId}`);
        let orderSnapshot;
        try {
            orderSnapshot = await tempOrderRef.get();
        } catch (error) {
            console.error('tempOrder not found in database:', error);
            errorForAdmin.push("TempOrder not found.");
            return res.json({ message: 'Order not found in database. Please try again.', type: 'negative' });
        }


        //get order item data
        const orderVal = orderSnapshot.val();
        console.log("order 1");

        let orderItems = [];
        let totalItems = 0;
        let totalPrice = 0;

        for (let cartId of orderVal.items) {
            const cartItemRef = req.firestore.collection('cart')
                .doc(userId)
                .collection('cartItems')
                .doc(cartId);

            const doc = await cartItemRef.get();

            if (doc.exists) {
                const cartData = doc.data();
                console.log(" item data :", cartData);
                const { category, subCategory, name, volume, qty } = cartData;
                console.log(` cart item: ${name}, Volume: ${volume}, Qty: ${qty}`);

                const itemRef = req.firestore.collection('items').doc(category).collection(subCategory).doc(name);
                const itemSnapshot = await itemRef.get();

                if (!itemSnapshot.exists) {
                    console.log("Order Item data not found.");
                    return res.json({ type: 'negative', message: 'Order Item data not found.' });
                }

                const itemData = itemSnapshot.data();

                let price = getClosestWeightAndPrice(volume, itemData) * qty;
                totalPrice += price;
                totalItems += 1;
                console.log("totalPrice " + totalPrice);

                orderItems.push({ cartId: cartId, name: name, quantity: volume + " x " + qty, price: price });

            } else {
                console.warn(`Cart item with ID ${cartId} does not exist.`);
                errorForAdmin.push(`Cart item with ID ${cartId} does not exist.`);
                return res.json({ type: 'negative', message: `Cart item with ID ${cartId} does not exist.` });
            }
        }

        const currentDateTime = new Date();
        const orderData = { orderStatus: "pending", orderItems, orderUserId: userId, orderTotalItems: totalItems, orderTotalPrice: totalPrice, cartDateTime: orderVal.dateTime, fullName, email, phone, streetAddress, city, pincode, dateTime: currentDateTime };
        console.log("orderData");
        console.log(orderData);

        //add order data in firestore order
        const orderedRef = req.firestore.collection('order').doc(orderId);
        try {
            await orderedRef.set(orderData);
        } catch (error) {
            errorForAdmin.push("Order not added in firestore.");
            console.error('Error to add order to firestore :', error); // Log the error for debugging
            return res.json({ message: 'Order not added to firestore. Please try again.', type: 'negative' });
        }

        //add pendingorder data in firestore pendingorder
        const pendingOrderRef = req.firestore.collection('pendingOrders').doc(orderId);
        try {
            await pendingOrderRef.set({dateTime: currentDateTime});
        } catch (error) {
            errorForAdmin.push("pendingOrders not added in firestore.");
            console.error('Error to add pendingOrders to firestore :', error); // Log the error for debugging
        }

        //add orderByUserId data in firestore orderByUserId
        const orderInfo = {
                totalPrice: totalPrice,
                totalItems: totalItems,
                status: "pending",
                orderTime: currentDateTime,
        };

        const orderByUserIdrRef = req.firestore.collection('orderByUserId').doc(userId).collection('orders').doc(orderId);
        try {
            await orderByUserIdrRef.set(orderInfo);
        } catch (error) {
            errorForAdmin.push("orderByUserId not added in firestore orderByUserId.");
            console.error('Error to add orderByUserId to firestore orderByUserId :', error); // Log the error for debugging
        }


        //delete tempOrder in firebase 
        try {
            await tempOrderRef.remove();
          } catch (error) {
            errorForAdmin.push("Cannot delete tempOrder data");
            console.error("Error deleting tempOrder data:", error);
          }

        //delete order items from cart
        let totalDeleteItems = 0;
        for (let cartId of orderVal.items) {
            const cartItemRef = req.firestore.collection('cart')
                .doc(userId)
                .collection('cartItems')
                .doc(cartId);

            try {
                await cartItemRef.delete();
                totalDeleteItems += 1;
            } catch (error) {
                errorForAdmin.push("Cannot delete cart data");
                console.error('Error to delete order to database :', error); // Log the error for debugging
            }
        }

         //add userid cookie by tempId cookie
         try {
            if (!tempUser) {
                res.cookie('userId', userId, {
                    maxAge: maxageTimeForUserId,
                    httpOnly: true,
                    // secure: process.env.NODE_ENV === 'production',  // Sends the cookie only over HTTPS in production
                    sameSite: 'Strict'
                });
            }
        } catch (error) {
            console.error("Error adding userId in client browser:", error);
            errorForAdmin.push("Error adding userId in client browser.");
        }


        //send order submit email to user
        orderFormSubmitUser.orderFormSubmit(orderItems, orderData, orderId)
            .then(() => {
                console.log("Order email sent to user.");
            })
            .catch((error) => {
                console.error("Email error :" + error);
                errorForAdmin.push("Order email not sent to user.");
            });

        //send order submit email to agent
        orderFormSubmitAgent.orderFormSubmit(orderItems, orderData, orderId, errorForAdmin, logsForAdmin)
            .then(() => {
                console.log("Order email sent to agent.");
            })
            .catch((error) => {
                console.error("Email error :" + error);
            });


        // send response to frontend
        return res.json({ type: "positive", message: 'Order successfully placed!' });

    } catch (error) {
        console.error('Error processing order:', error);
        return res.json({ type: 'negative', message: 'Error placing order. Please try again.' });
    }
});



module.exports = router;