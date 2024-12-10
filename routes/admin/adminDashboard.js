const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');
const { sortDateTimeForRealTimeDatabase } = require('../../utilities/dateTime');


const router = express.Router();

// Admin dashboard (protected route)
router.get('/', authenticateAdmin, async (req, res) => {
  console.log('Reached route handler');
  let pendingOrders = 0;
  let cancelledOrders = 0;
  let completedOrders = 0;

  //pending order count
  const pendingOrdersRef = req.firestore.collection('pendingOrders');
  const completedOrdersRef =  req.firestore.collection('completedOrders');
  const cancelledOrdersRef = req.firestore.collection('cancelledOrders');

  try {
    const aggregateQuerySnapshot = await pendingOrdersRef.count().get();
    pendingOrders = aggregateQuerySnapshot.data().count;
  } catch (error) {
    console.error('pendingOrders not found in database:', error);
  }
  try {
    const aggregateQuerySnapshot = await completedOrdersRef.count().get();
    completedOrders = aggregateQuerySnapshot.data().count;
  } catch (error) {
    console.error('completedOrders not found in database:', error);
  }
  try {
    const aggregateQuerySnapshot = await cancelledOrdersRef.count().get();
    cancelledOrders = aggregateQuerySnapshot.data().count;
  } catch (error) {
    console.error('cancelledOrders not found in database:', error);
  }


  res.render('admin/adminDashboard', { pendingOrders: pendingOrders, cancelledOrders: cancelledOrders, completedOrders: completedOrders, admin: req.admin, nonce: res.locals.nonce, activePage: 'dashboard', user: "true", totalCart: 0 });
});


module.exports = router;