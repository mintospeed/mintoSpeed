require("dotenv").config();

const express = require('express');
const app = express();
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid'); // Unique user IDs
const admin = require('firebase-admin');

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5000, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Initialize Firebase Admin SDK only once
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});


// Firebase injection middleware
app.use((req, res, next) => {
    req.database = admin.database();
    req.firestore = admin.firestore();
    req.Timestamp = admin.firestore.Timestamp;
    req.auth = admin.auth();
    next();
});


// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
    contentSecurityPolicy: false  // Disable Helmet's default CSP handling
}));

// Generate a nonce and set CSP headers dynamically
app.use((req, res, next) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    res.setHeader('Content-Security-Policy', `
        default-src 'self';
        script-src 'self' https://kit.fontawesome.com https://ajax.googleapis.com https://cdnjs.cloudflare.com 'nonce-${nonce}' https://www.google.com https://www.gstatic.com;
        style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
        connect-src 'self' https://ka-f.fontawesome.com https://www.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
        img-src 'self' https://storage.googleapis.com https://www.gstatic.com;
        frame-src 'self' https://www.google.com https://www.gstatic.com;
        frame-ancestors 'self' https://www.google.com;
    `.replace(/\n/g, ''));
    next();
});


// Import route modules
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const itemsRoutes = require('./routes/items');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin/admin');
const orderFormRoutes = require('./routes/orderForm');
const complaintRoutes = require('./routes/complaint');
const feedbackRoutes = require('./routes/feedback');
const profileRoutes = require('./routes/profile');
const trackRoutes = require('./routes/track');
const ordersRoutes = require('./routes/orders');
const viewDetailsRoutes = require('./routes/viewDetails');
const dashboardRoutes = require('./routes/admin/adminDashboard');
const adminPendingOrdersRoutes = require('./routes/admin/adminPendingOrders');
const adminCompletedOrdersRoutes = require('./routes/admin/adminCompletedOrders');
const adminCancelledOrdersRoutes = require('./routes/admin/adminCancelledOrders');
const adminAddItemRoutes = require('./routes/admin/adminAddItem');
const adminModifyItemRoutes = require('./routes/admin/adminModifyItem');
const adminDeleteItemRoutes = require('./routes/admin/adminDeleteItem');


// Use route modules
app.use('/auth', authRoutes);
app.use('/', indexRoutes);
app.use('/items', itemsRoutes);
app.use('/cart', cartRoutes);
app.use('/orderForm', orderFormRoutes);
app.use('/complaint', complaintRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/profile', profileRoutes);
app.use('/track', trackRoutes);
app.use('/orders', ordersRoutes);
app.use('/order-details', viewDetailsRoutes);
app.use('/admin983', adminRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/dashboard/pendingOrders', adminPendingOrdersRoutes);
app.use('/dashboard/completedOrders', adminCompletedOrdersRoutes);
app.use('/dashboard/cancelledOrders', adminCancelledOrdersRoutes);
app.use('/dashboard/addItem', adminAddItemRoutes);
app.use('/dashboard/modifyItem', adminModifyItemRoutes);
app.use('/dashboard/deleteItem', adminDeleteItemRoutes);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// app.get('/',  (req, res) => {
//     res.json({message : "welcome to mintoSpeed"});
// });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// module.exports = app;
