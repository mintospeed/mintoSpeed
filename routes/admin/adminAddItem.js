const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');

const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const bucket = admin.storage().bucket();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve the main page (index.ejs)
router.get('/', authenticateAdmin, (req, res) => {
    return res.render('admin/adminAddItem', { nonce: res.locals.nonce });
});



// Route to handle adding a new item
router.post('/add-item', authenticateAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        const { itemName, category, subcategory, minQty, maxQty, popularQty, popularPrice, packed, weightPriceCombinations, itemAbout } = req.body;

        const isValidString = (str) => typeof str === 'string' && /^[a-zA-Z0-9_\- &]+$/.test(str);
        const isValidNumber = (num) => !isNaN(num) && num > 0;
    
        if (!isValidString(itemName)) return res.json({ success: false, message: 'Invalid or missing itemName.' });
        if (!isValidString(category)) return res.json({ success: false, message: 'Invalid or missing category.' });
        if (!isValidString(subcategory)) return res.json({ success: false, message: 'Invalid or missing subcategory.' });
        if (!isValidNumber(parseInt(minQty))) return res.json({ success: false, message: 'Invalid or missing minQty.' });
        if (!isValidNumber(parseInt(maxQty))) return res.json({ success: false, message: 'Invalid or missing maxQty.' });
        if (!isValidNumber(parseInt(popularQty))) return res.json({ success: false, message: 'Invalid or missing popularQty.' });
        if (!isValidNumber(parseFloat(popularPrice))) return res.json({ success: false, message: 'Invalid or missing popularPrice.' });
        if (typeof packed !== 'string' || !['true', 'false'].includes(packed)) return res.json({ success: false, message: 'Invalid packed value.' });
    
        try {
            JSON.parse(weightPriceCombinations);
        } catch (error) {
            return res.json({ success: false, message: 'Invalid or missing weightPriceCombinations.' });
        }        

        let imageUrl = '';
        if (req.file) {
            const filename = `images/${uuidv4()}-${req.file.originalname}`;
            const file = bucket.file(filename);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype },
                public: true
            });

            imageUrl = file.publicUrl();
        }

        const db = req.firestore;

        // 1. Create placeholder document at `items/{category}` level if it doesn't exist
        const categoryRef = db.collection('items').doc(category);
        const categorySnapshot = await categoryRef.get();
        
        if (!categorySnapshot.exists) {
            await categoryRef.set({});  // Add an empty document at category level
        }

        // 2. Save data to the specified subcategory collection
        await categoryRef.collection(subcategory).doc(itemName).set({
            min: minQty,
            max: maxQty,
            qty: popularQty,
            price: popularPrice,
            packed: packed === 'true',
            img: imageUrl,
            options: weightPriceCombinations,
            itemAbout: itemAbout
        });

        return res.json({ success: true });
    } catch (error) {
        console.error("Error adding item:", error);
        return res.json({ success: false, message: error.message });
    }
});



// Route to get categories
router.post('/get-categories', authenticateAdmin, async (req, res) => {
    console.log("Fetching categories...");  // Logs when the route is reached
    try {
        const db = req.firestore;
        
        const categoriesSnapshot = await db.collection('items').select().get();
        
        if (categoriesSnapshot.empty) {
            console.error("No categories data found in Firestore.");
            return res.status(404).json({ error: 'No categories found' });
        }
        const documentIds = categoriesSnapshot.docs.map((doc) => doc.id);

        return res.json(documentIds);
    } catch (error) {
        console.error("Error in /get-categories route:", error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Route to get subcategories for a specific category
router.post('/get-subcategories', authenticateAdmin, async (req, res) => {
    const { category } = req.body;

    if (!category) {
        return res.status(400).json({ error: 'Category is required' });
    }

    try {
        const subcategoriesSnapshot = await req.firestore.collection('items').doc(category).listCollections();

        const subcategories = subcategoriesSnapshot.map((subcat) => subcat.id);  // Each sub-collection represents a subcategory
        return res.json(subcategories);
    } catch (error) {
        console.error("Error in /get-subcategories route:", error);
        return res.status(500).json({ error: 'Failed to fetch subcategories' });
    }
});



module.exports = router;