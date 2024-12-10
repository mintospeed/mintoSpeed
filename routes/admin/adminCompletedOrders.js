const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');
const { timestampIntoString } = require('../../utilities/dateTime');
const limit = 2;
const fetchLimit = 2;



const router = express.Router();

// Admin dashboard (protected route)
router.get('/', authenticateAdmin, async (req, res) => {
  const detailedOrders = [];
  let totalOrders = 0;
  let errorString = '';

  const pendordersRef = req.firestore.collection('completedOrders');

  try {
    // Get the total count of completed orders
    const completedCountSnapshot = await pendordersRef.count().get();
    totalOrders = completedCountSnapshot.data().count;

    const snapshot = await pendordersRef.orderBy('dateTime', 'desc').limit(limit).get();

    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        const orderId = doc.id;
        console.log("orderId" + orderId);

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
            errorString += `Order ${orderId} not found in Firestore`;
          }
        } catch (firestoreError) {
          console.error(`Error fetching Firestore details for order ${orderId}:`, firestoreError);
          errorString += `Error fetching Firestore details for order ${orderId}, `;
        }
      }

      console.log(JSON.stringify(detailedOrders, null, 2));

    } else {
      console.log("No completed orders found.");
      return res.render('admin/adminCompletedOrders', {
        errorString,
        nonce: res.locals.nonce,
        activePage: 'admin completed orders',
        user: "true",
        totalCart: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    errorString += `Error in fetching orders : ${error}`;
    return res.render('admin/adminCompletedOrders', {
      errorString,
      nonce: res.locals.nonce,
      activePage: 'admin completed orders',
      user: "true",
      totalCart: 0,
    });
  }

  const totalPages = totalOrders > 0 ? Math.ceil(totalOrders / limit) : 0;

  return res.render('admin/adminCompletedOrders', {
    errorString,
    totalPages,
    totalOrders,
    orders: detailedOrders,
    nonce: res.locals.nonce,
    activePage: 'admin completed orders',
    user: "true",
    totalCart: 0,
  });
});

// Route to fetch orders by page (AJAX)
router.post('/fetch-orders', async (req, res) => {
    const { page } = req.body;
    const pendordersRef = req.firestore.collection('completedOrders');
    const offset = (page - 1) * fetchLimit;
    const detailedOrders = [];
    let errorString = '';
  
    console.log("--------------");
  
  
    try {
      const snapshot = await pendordersRef.orderBy('dateTime', 'desc').offset(offset).get();
  
      if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
          const orderId = doc.id;
  
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
              console.log(`Order ${orderId} not found in Firestore`);
              errorString += `Order ${orderId} not found in Firestore`;
            }
          } catch (firestoreError) {
            console.error(`Error fetching Firestore details for order ${orderId}:`, firestoreError);
            errorString += `Error fetching Firestore details for order ${orderId}:`;
          }
        }
      } else {
        console.log("No orders found.");
        return res.json({ success: false, message: `No orders found.` });
      }
  
      return res.json({ success: true, detailedOrders, message: 'Order fetch successfully!', errorString });
    } catch (error) {
      console.error('Error fetching paginated orders:', error);
      return res.json({ success: false, message: `Error fetching orders + ${error}` });
    }
  });
  

module.exports = router;