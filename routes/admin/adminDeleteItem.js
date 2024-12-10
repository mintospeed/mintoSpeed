const express = require('express');
const authenticateAdmin = require('../../middlewares/authenticateAdmin');

const router = express.Router();


// Serve the main page (index.ejs)
router.get('/', authenticateAdmin, (req, res) => {
    return res.render('admin/adminDeleteItem', { nonce: res.locals.nonce });
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


//get items
router.post('/get-items', authenticateAdmin, async (req, res) => {
    console.log("Fetching items...");  // Logs when the route is reached
    const { category, subcategory } = req.body;

    if (!category || !subcategory) {
        return res.status(400).json({ error: 'Category or subcategory is required' });
    }
    try {
        const db = req.firestore;
        
        const itemsSnapshot = await db.collection('items').doc(category).collection(subcategory).select().get();
        
        if (itemsSnapshot.empty) {
            console.error("No items data found in Firestore.");
            return res.status(404).json({ error: 'No items found' });
        }
        const documentIds = itemsSnapshot.docs.map((doc) => doc.id);

        return res.json(documentIds);
    } catch (error) {
        console.error("Error in /get-items route:", error);
        return res.status(500).json({ error: 'Failed to fetch items.' });
    }
});



//delete item
router.post('/delete-item', authenticateAdmin, async (req, res) => {
    console.log("deleting items...");  // Logs when the route is reached
    const { itemName, category, subcategory } = req.body;
    console.log("delete : " + itemName + category + subcategory);


    if (!category || !subcategory || !itemName) {
        return res.json({ success: false, message: 'itemName, Category or subcategory not found.' });
    }
    try {
        const db = req.firestore;
        const itemsSnapshot = db.collection('items').doc(category).collection(subcategory).doc(itemName);
        const docSnapshot = await itemsSnapshot.get();

        if (docSnapshot.exists) {
          await itemsSnapshot.delete();
        }
        return res.json({ success: true });
    } catch (error) {
        console.error("Error in /delete-item route:", error);
        return res.json({ success: false, message: 'Failed to delete item.' });
    }
});

module.exports = router;