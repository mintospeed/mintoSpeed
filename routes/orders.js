const express = require('express');
const router = express.Router();
const { getTotalCartItems } = require('../databaseQuery/getTotalCartNumber');
const { timestampIntoString } = require('../utilities/dateTime');
const { parse } = require('date-fns');
const setCartCookie = require('../middlewares/cartCookie');

const maxageTime = 12 * 60 * 60 * 1000; //12 hours
const limit = 3;

router.get('/',setCartCookie, async (req, res) => {
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let totalCartItem = req.totalCart || 0;;
    const signedUser = req.cookies.userId ? 'true' : 'false';
    let allOrders = [];
    let pendingOrders;
    let totalAllOrders = 0
    let totalPendingOrders = 0;


    // If no user ID or temp ID, return empty cart
    if (!userId && !tempId) {
        return res.render('orders', { nonce: res.locals.nonce, activePage: 'orders', user: signedUser, totalCart: totalCartItem });
    } else if (!userId && tempId) {
        return res.render('orders', { nonce: res.locals.nonce, activePage: 'orders', user: signedUser, totalCart: totalCartItem });
    }

    if (!userId) {
        return res.render('orders', { nonce: res.locals.nonce, activePage: 'orders', user: signedUser, totalCart: totalCartItem });
    }

    //pending and all order detail
    try {
        const ordersCollection = req.firestore.collection('orderByUserId').doc(userId).collection('orders');

        const pendingCountSnapshot = await ordersCollection
            .where('status', '==', 'pending')
            .count()
            .get();
            
        totalPendingOrders = pendingCountSnapshot.data().count;
        const allCountSnapshot = await ordersCollection.count().get();
        totalAllOrders = allCountSnapshot.data().count;

        const pendingOrdersSnapshot = await ordersCollection
            .where('status', '==', 'pending')
            .orderBy('orderTime', 'desc')
            .limit(limit)
            .get();
            
            pendingOrders = pendingOrdersSnapshot.docs.map(doc => ({
                orderId: doc.id,
                orderTime: timestampIntoString(doc.data().orderTime),
                deliveryTime: timestampIntoString(doc.data().deliveryTime),
                status: doc.data().status,
                totalItems: doc.data().totalItems,
                totalPrice: doc.data().totalPrice
            }));
            
        // Fetch the first page of all orders
        const allOrdersSnapshot = await ordersCollection
            .orderBy('orderTime', 'desc')
            .limit(limit)
            .get();

        allOrders = allOrdersSnapshot.docs.map(doc => ({
            orderId: doc.id,
            orderTime: timestampIntoString(doc.data().orderTime),
            deliveryTime: timestampIntoString(doc.data().deliveryTime),
            status: doc.data().status,
            totalItems: doc.data().totalItems,
            totalPrice: doc.data().totalPrice
        }));

        return res.render('orders', {
            nonce: res.locals.nonce,
            activePage: 'orders',
            user: "true", // Replace with user data
            totalCart: totalCartItem, // Replace with cart count
            pendingOrders,
            allOrders,
            totalPendingOrders,
            totalAllOrders,
            totalPendingPages: Math.ceil(totalPendingOrders / limit),
            totalAllPages: Math.ceil(totalAllOrders / limit),
        });
    } catch (error) {
        console.error('Error loading orders page:', error);
        return res.render('orders', {
            nonce: res.locals.nonce,
            activePage: 'orders',
            user: "true",
            totalCart: totalCartItem,
            pendingOrders,
            allOrders,
            totalPendingOrders,
            totalAllOrders,
            totalPendingPages: 0,
            totalAllPages: 0,
        });
    }
});

// Route to fetch orders by page (AJAX)
router.post('/fetch-orders', async (req, res) => {
    try {
        let userId = req.cookies.userId;
        let tempId = req.cookies.tempId;
        const { page, type } = req.body;
        const ordersCollection = req.firestore.collection('orderByUserId').doc(userId).collection('orders');
        const offset = (page - 1) * limit;

        if (!userId && !tempId) {
            return res.json({ success: false });
        } else if (!userId && tempId) {
            return res.json({ success: false });
        }

        let query;
        if (type === 'pending') {
            query = ordersCollection
                .where('status', '==', 'pending')
                .orderBy('orderTime', 'desc')
                .offset(offset)
                .limit(limit);
        } else {
            query = ordersCollection.orderBy('orderTime', 'desc').offset(offset).limit(limit);
        }

        const snapshot = await query.get();
        const orders = snapshot.docs.map(doc => ({
            orderId: doc.id,
            orderTime: timestampIntoString(doc.data().orderTime),
            deliveryTime: timestampIntoString(doc.data().deliveryTime),
            status: doc.data().status,
            totalItems: doc.data().totalItems,
            totalPrice: doc.data().totalPrice
        }));

        return res.json({ success: true, orders });
    } catch (error) {
        console.error('Error fetching paginated orders:', error);
        return res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});




module.exports = router;