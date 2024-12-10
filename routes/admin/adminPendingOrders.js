const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');
const { timestampIntoString } = require('../../utilities/dateTime');
const limit = 2;
const fetchLimit = 2;
let flag = "positive";
let msg = '';


const router = express.Router();

// Admin dashboard (protected route)
router.get('/', authenticateAdmin, async (req, res) => {
  const detailedOrders = [];
  let totalPendingOrders = 0;
  let errorString = '';
  const queryOrderId = req.query.orderId;

  const pendordersRef = req.firestore.collection('pendingOrders');

  if(queryOrderId){
    try {
      const orderDoc = await req.firestore.collection("order").doc(queryOrderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        detailedOrders.push({
          orderId: orderData.id,
          orderTime: timestampIntoString(orderData.dateTime),
          deliverTime: timestampIntoString(orderData.deliveryTime) || '',
          ...orderData,
        });

      } else {
        console.log(`Order ${queryOrderId} not found in Firestore, `);
        errorString += `Order ${queryOrderId} not found in Firestore`;
      }
    } catch (firestoreError) {
      console.error(`Error fetching Firestore details for order ${queryOrderId}:`, firestoreError);
      errorString += `Error fetching Firestore details for order ${queryOrderId}, `;
    }

    return res.render('admin/adminPendingOrders', {
      errorString,
      totalPendingOrders: "Specific User",
      pendingOrders: detailedOrders,
      nonce: res.locals.nonce,
      activePage: 'admin pending orders',
      user: "true",
      totalCart: 0,
    });
  }
  else{
    try {
      // Get the total count of pending orders
      const pendingCountSnapshot = await pendordersRef.count().get();
      totalPendingOrders = pendingCountSnapshot.data().count;
  
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
        console.log("No pending orders found.");
        return res.render('admin/adminPendingOrders', {
          errorString,
          nonce: res.locals.nonce,
          activePage: 'admin pending orders',
          user: "true",
          totalCart: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      errorString += `Error in fetching orders : ${error}`;
      return res.render('admin/adminPendingOrders', {
        errorString,
        nonce: res.locals.nonce,
        activePage: 'admin pending orders',
        user: "true",
        totalCart: 0,
      });
    }
  
    const totalPendingPages = totalPendingOrders > 0 ? Math.ceil(totalPendingOrders / limit) : 0;
  
    return res.render('admin/adminPendingOrders', {
      errorString,
      totalPendingPages,
      totalPendingOrders,
      pendingOrders: detailedOrders,
      nonce: res.locals.nonce,
      activePage: 'admin pending orders',
      user: "true",
      totalCart: 0,
    });
  }
});




// Route to fetch orders by page (AJAX)
router.post('/fetch-orders', async (req, res) => {
  const { page } = req.body;
  const pendordersRef = req.firestore.collection('pendingOrders');
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
      console.log("No pending orders found.");
      return res.json({ success: false, message: `No pending orders found.` });
    }

    return res.json({ success: true, detailedOrders, message: 'Order fetch successfully!', errorString });
  } catch (error) {
    console.error('Error fetching paginated orders:', error);
    return res.json({ success: false, message: `Error fetching orders + ${error}` });
  }
});


//////////////////////////////////////////////////////operations

router.post('/performAction', authenticateAdmin, async (req, res) => {
  const { action, orderId, cancelReason, deliveryDateTime, userId } = req.body;
  let deliveryDateTimeFirestore;


  ////////////cancelled actions
  if (action === 'Cancelled') {
    console.log("userId : " + userId + "cancelled action : " + action + ", orderId : " + orderId + ", cancelReason : " + cancelReason + ", deliveryDateTime" + deliveryDateTime);

    let validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &,.]+$/.test(input);
    if (!validateInput(cancelReason)) {
      return res.json({ message: "Cancel reason not validated. Write and try again.", type: "negative" });
    }

    if (cancelReason == null || cancelReason.length < 1) {
      return res.json({ message: "Please write cancel reason.", type: "negative" });
    }
    deliveryDateTimeFirestore = new Date();

    const result1 = await updateOrder(req, res, orderId, "cancelled", deliveryDateTimeFirestore, cancelReason);
    if(result1.type == "negative"){
      return res.json({ message: msg + result1.message, type: "negative" });
    }
    const result2 = await updateOrderByUserId(req, res, userId, orderId, "cancelled", deliveryDateTimeFirestore, cancelReason);
    if(result2.type == "negative"){
      return res.json({ message: msg + result2.message, type: "negative" });
    }
    const result3 = await deletePendingOrders(req, res, orderId);
    if(result3.type == "negative"){
      return res.json({ message: msg + result3.message, type: "negative" });
    }

    try {
      const actRef = req.firestore.collection('cancelledOrders').doc(orderId);
      await actRef.set({dateTime: deliveryDateTimeFirestore});
    } catch (error) {
      msg += " Order not added in cancelledOrders collection";
      flag = "negative";
    }
    msg += " Operation performed successful.";

    return res.json({ message: msg, type: flag });
  } 
   //////////// completed actions
  else if (action === 'Completed') {
    console.log("userId : " + userId + "completed action : " + action + ", orderId : " + orderId + ", cancelReason : " + cancelReason + ", deliveryDateTime" + deliveryDateTime);
    deliveryDateTimeFirestore = new Date();

    const result1 = await updateOrder(req, res, orderId, "completed", deliveryDateTimeFirestore, null);
    if(result1.type == "negative"){
      return res.json({ message: msg + result1.message, type: "negative" });
    }
    const result2 = await updateOrderByUserId(req, res, userId, orderId, "completed", deliveryDateTimeFirestore, null);
    if(result2.type == "negative"){
      return res.json({ message: msg + result2.message, type: "negative" });
    }
    const result3 = await deletePendingOrders(req, res, orderId);
    if(result3.type == "negative"){
      return res.json({ message: msg + result3.message, type: "negative" });
    }

    try {
      const actRef = req.firestore.collection('completedOrders').doc(orderId);
      await actRef.set({dateTime: deliveryDateTimeFirestore});
    } catch (error) {
      msg += " Order not added in completedOrders collection";
      flag = "negative";
    }

    msg += " Operation performed successful.";

    return res.json({ message: msg, type: flag });
  }
  /////////////////pending actions
  else if (action === 'Pending') {
    console.log("userId : " + userId + "pending action : " + action + ", orderId : " + orderId + ", cancelReason : " + cancelReason + ", deliveryDateTime" + deliveryDateTime);
    if(deliveryDateTime == "" || deliveryDateTime == null){
      deliveryDateTimeFirestore = new Date();
    }
    else{
      const date = new Date(deliveryDateTime);
      deliveryDateTimeFirestore = req.Timestamp.fromDate(date);
    }
   
    const result1 = await updateOrder(req, res, orderId, "pending", deliveryDateTimeFirestore, null);
    if(result1.type == "negative"){
      return res.json({ message: msg + result1.message, type: "negative" });
    }
    const result2 = await updateOrderByUserId(req, res, userId, orderId, "pending", deliveryDateTimeFirestore, null);
    if(result2.type == "negative"){
      return res.json({ message: msg + result2.message, type: "negative" });
    }
  

    msg += " Operation performed successful.";

    return res.json({ message: msg, type: flag });
  }
  else {
    return res.json({ message: `No action performed`, type: "negative" });
  }
});


//update order collection
async function updateOrder(req, res, orderId, status, deliveryTime, cancelReason) {
  try {
    const actionDataRef = req.firestore.collection('order').doc(orderId);
    const docSnapshot = await actionDataRef.get();

    if (docSnapshot.exists) {
      if(status == "cancelled"){
        await actionDataRef.update({
          orderStatus: status,
          deliveryTime: deliveryTime,
          cancelReason: cancelReason,
        });
      }
      else{
        await actionDataRef.update({
          orderStatus: status,
          deliveryTime: deliveryTime,
        });
      }
    } else {
      flag = "negative";
      msg += "orderId doesn't exit in order collection ";
    }
  } catch (error) {
    console.error("Error update order  in firestore order: ", error);
    return { message: "Error update order  in firestore order " + error, type: "negative" };
  }
  return { message: "Successfull.", type: "positive" };
}

//update orderByUserId
async function updateOrderByUserId(req, res, userId, orderId, status, deliveryTime, cancelReason) {
  try {
    const actionDataRef = req.firestore.collection('orderByUserId').doc(userId).collection('orders').doc(orderId);
    const docSnapshot = await actionDataRef.get();

    if (docSnapshot.exists) {
      if(status == "cancelled"){
        await actionDataRef.update({
          status: status,
          deliveryTime: deliveryTime,
          cancelReason: cancelReason,
        });
      }
      else{
        await actionDataRef.update({
          status: status,
          deliveryTime: deliveryTime,
        });
      }
    } else {
      flag = "negative";
      msg += "order data doesn't exit in orderByUserId collection ";
    }
  } catch (error) {
    console.error("Error update orderByUserId  in firestore: ", error);
    return { message: "Error update orderByUserId  in firestore orderByUserId " + error, type: "negative" };
  }
  return { message: "Successfull.", type: "positive" };
}

//delete pendingOrders orderId
async function deletePendingOrders(req, res, orderId) {
  try {
    const actionDataRef = await req.firestore.collection('pendingOrders').doc(orderId);
    const docSnapshot = await actionDataRef.get();

    if (docSnapshot.exists) {
      await actionDataRef.delete();
    }
  } catch (error) {
    console.error("Error deleting pendingOrders  in firestore: ", error);
    return { message: "Error deleting pendingOrders " + error, type: "negative" };
  }
  return { message: "Successfull.", type: "positive" };
}


module.exports = router;