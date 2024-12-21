const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
// Import and configure dayjs with customParseFormat
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const { convertToGrams, generateUniqueId } = require('../utilities/utility');
const fetchSectionQuantity = 1;
const maxageTime = 12 * 60 * 60 * 1000; //12 hours
const maxageTimeForTempId = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
const validateUser = require('../middlewares/validateUser');

const setCartCookie = require('../middlewares/cartCookie');

// Route to render initial grocery page with EJS
router.get('/', setCartCookie, async (req, res) => {
    const firestore = req.firestore;
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let totalCartItem = req.totalCart || 0;
    const signedUser = req.cookies.userId ? 'true' : 'false';
    let documentIds = [];


    if (!userId && !tempId) {
        totalCartItem = 0
    }
    else if (!userId && tempId) {
        userId = tempId;
    }

    //get category names
    try {        
        const categoriesSnapshot = await firestore.collection('items').select().get();

        if (categoriesSnapshot.empty) {
            console.error("No categories data found in Firestore.");
        } else {
            documentIds = categoriesSnapshot.docs.map((doc) => {
                const realName = doc.id; // Assuming the document ID is the real name
                const encodedValue = encodeURIComponent(realName); // URI-encode the real name
                return { key: realName, value: encodedValue }; // Return an object with key and value
            });
        
            console.log(documentIds);
        }        
    } catch (error) {
        console.error("Error in get-categories :", error);
    }

    try {
        // Fetch first 5 categories
        const categoriesSnapshot = await firestore.collection('items').limit(fetchSectionQuantity).get();
        const initialCategories = [];

        for (const categoryDoc of categoriesSnapshot.docs) {
            const categoryName = categoryDoc.id;

            // Fetch the first subcategory and its items
            const subcategories = await fetchFirstSubcategoryWithItems(req, res, categoryDoc, firestore);
            initialCategories.push({
                id: categoryName,
                subcategories
            });
        }

        // Render initial data with EJS
        return res.render('index', { nonce: res.locals.nonce, activePage: 'home', user: signedUser, totalCart: totalCartItem, categories: initialCategories, categoryNames: documentIds });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.render('index', { nonce: res.locals.nonce, activePage: 'home', user: signedUser, totalCart: totalCartItem });
    }
});

// Helper function to fetch the first subcategory with limited items
async function fetchFirstSubcategoryWithItems(req, res, categoryDoc, firestore) {
    const subcategoriesSnapshot = await categoryDoc.ref.listCollections();
    const subcategories = [];

    console.log("fetchFirstSubcategoryWithItems");
    for (let i = 0; i < subcategoriesSnapshot.length; i++) {
        const subcategory = subcategoriesSnapshot[i];

        if (i === 0) {
            // For the first subcategory, fetch items
            const items = await fetchItemsForSubcategory(req, res, firestore, categoryDoc.id, subcategory.id, 10); // Limit to 10 items

            subcategories.push({
                id: subcategory.id,
                items: items.items,
                lastItem: items.lastVisible
            });
        } else {
            // For other subcategories, only store the id
            subcategories.push({
                id: subcategory.id,
                items: [],
                lastItem: null
            });
        }
    }

    return subcategories;
}


// Fetch items in a subcategory with pagination support
async function fetchItemsForSubcategory(req, res, firestore, categoryId, subCategoryId, limit = 10, startAfter = null) {
    console.log("fetch Items For Subcategory");

    let query = firestore.collection('items').doc(categoryId).collection(subCategoryId);
    // let query = firestore.collection('items').doc(categoryId).collection(subCategoryId).limit(limit);
    if (startAfter) query = query.startAfter(startAfter);

    const itemsSnapshot = await query.get();

    const items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        volume: doc.data().qty,
        price: doc.data().price,
        minVol: doc.data().min,
        maxVol: doc.data().max,
        packed: doc.data().packed,
        image_url: doc.data().img,
        options: JSON.parse(doc.data().options) || []
    }));

    return { items, lastVisible: itemsSnapshot.docs[itemsSnapshot.docs.length - 1] };
}

// Load more categories or subcategories dynamically on scroll
router.post('/load_more_sections', async (req, res) => {
    console.log("load more Items called");

    try {
        const firestore = req.firestore;
        const { lastVisible } = req.body; // Get lastVisible from request body

        let query = firestore.collection('items').limit(fetchSectionQuantity);
        if (lastVisible) {
            // Get the document from which to start
            const lastVisibleDoc = await firestore.collection('items').doc(lastVisible).get();
            query = query.startAfter(lastVisibleDoc);
        }

        const categoriesSnapshot = await query.get();
        const additionalCategories = [];

        for (const categoryDoc of categoriesSnapshot.docs) {
            const categoryName = categoryDoc.id;
            const subcategories = await fetchFirstSubcategoryWithItems(req, res, categoryDoc, firestore);
            additionalCategories.push({
                id: categoryName,
                subcategories
            });
        }

        // If no categories were found, return an empty response
        if (additionalCategories.length === 0) {
            return res.json({ categories: [] });
        }

        // Return the last document ID for the next request
        const lastVisibleDocument = categoriesSnapshot.docs[categoriesSnapshot.docs.length - 1];
        return res.json({ categories: additionalCategories, lastVisible: lastVisibleDocument.id });
    } catch (error) {
        console.error('Error fetching additional sections:', error);
        return res.json({ message: 'Failed to load new categories.', type: 'negative' });
    }
});


router.post('/get_grocery_items', async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        const { category, subCategory } = req.body;

        // Validate category and subCategory inputs
        const validateInput = (input) => typeof input === 'string' && /^[a-zA-Z0-9_\- &]+$/.test(input);

        if (!validateInput(category)) {
            return res.json({ message: 'Invalid item category.', type: 'negative' });
        }
        if (!validateInput(subCategory)) {
            return res.json({ message: 'Invalid item subCategory.', type: 'negative' });
        }

        // Reference to items collection in Firestore
        const itemsRef = req.firestore
            .collection('items')
            .doc(category)
            .collection(subCategory);

        const snapshot = await itemsRef.get();

        if (snapshot.empty) {
            return res.json({ items: [], lastKey: null });
        }

        // Transform fetched data
        const items = await Promise.all(snapshot.docs.map(async (doc) => {

            return {
                name: doc.id,
                volume: doc.data().qty,
                price: doc.data().price,
                minVol: doc.data().min,
                maxVol: doc.data().max,
                packed: doc.data().packed,
                image_url: doc.data().img,
                options: JSON.parse(doc.data().options) || []
            };
        }));


        return res.json({ items });
    } catch (err) {
        console.error('Error fetching grocery items:', err);
        return res.json({ message: 'Error fetching grocery items.', type: 'negative' });
    }
});



// Backend: /add_to_cart endpoint
router.post('/add_to_cart', validateUser, async (req, res) => {
    let { item_name: itemName, item_weight: itemWeight, itemCategory, itemSubCategory } = req.body;

    let userId = req.userId; // Use tempId if userId is not available
    let totalCartItem = 0;

    // Validation
    const validateInput = (name, value) => {
        if (!value || typeof value !== 'string' || !/^[a-zA-Z0-9_.\- &]+$/.test(value)) {
            console.log(`error: ${name}: ${value}`);
            return res.json({ message: `Something went wrong. Item name issue occur.`, type: 'negative' });
        }
        return true;
    };

    if (![itemName, itemWeight, itemCategory, itemSubCategory].every((val, i) => validateInput(['item name', 'item weight', 'item category', 'item subcategory'][i], val))) {
        return;
    }

    itemName = itemName.toLowerCase(); // Ensure item name is lowercase

    try {
        const itemRef = req.firestore.collection('items').doc(itemCategory).collection(itemSubCategory).doc(itemName);
        const itemSnapshot = await itemRef.get();

        if (!itemSnapshot.exists) {
            console.log(`Product ${itemName} not found in our category.`);
            return res.json({ message: `${itemName} not found in our category.`, type: 'negative' });
        }

        const data = itemSnapshot.data();
        const { packed } = data;

        // Determine weights
        const [minWeight, maxWeight] = packed ?
            [parseInt(data.min), parseInt(data.max)] :
            [convertToGrams(data.min), convertToGrams(data.max)];
        const itemVol = packed ? parseInt(itemWeight) : convertToGrams(itemWeight);

        if (itemVol >= minWeight && itemVol <= maxWeight) {
            const cartItemData = {
                name: itemName,
                volume: itemWeight,
                qty: 1,
                category: itemCategory,
                subCategory: itemSubCategory,
                tempUser,
                dateTime: new Date()
            };

            // Reference to the user's cart for the given date
            const cartRef = req.firestore.collection('cart').doc(userId).collection('cartItems');

            try {
                await cartRef.add(cartItemData);
            } catch (error) {
                console.error('Error adding item to cart:', error); // Log the error for debugging
                if (error.code === 'permission-denied') {
                    return res.json({ message: 'Permission denied. Unable to add item to cart.', type: 'negative' });
                } else if (error.code === 'not-found') {
                    return res.json({ message: 'User cart not found. Please check the user ID.', type: 'negative' });
                } else {
                    return res.json({ message: 'Internal server error. Please try again later.', type: 'negative' });
                }
            }

            // update totalCart cookie
            const totalCart = req.cookies.totalCart;

            if (totalCart) {
                console.log(`add item totalCart is ${totalCart}`);
                totalCartItem = parseInt(totalCart, 10) + 1;
                res.cookie('totalCart', ( parseInt(totalCart, 10) + 1), {
                    maxAge: maxageTime,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',  // Uncomment if needed
                    sameSite: 'Strict'
                });

            } else {
                console.log('add item No totalCart cookie found');

                //get totalCart data from database
                try {
                    totalCartItem = 1;
                    res.cookie('totalCart', 1, {
                        maxAge: maxageTime,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',  // Uncomment if needed
                        sameSite: 'Strict'
                    });


                } catch (error) {
                    totalCartItem = 1;
                    console.error(" add item Error retrieving cookie:", error);
                    res.cookie('totalCart', 1, {
                        maxAge: maxageTime,
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'Strict'
                    });
                }
            }

            console.log('Item successfully added to cart!');

            return res.json({
                totalCart: totalCartItem,
                message: 'Item added to cart successfully.',
                type: 'positive',
            });

        } else {
            return res.json({ message: 'Invalid item weight or quantity.', type: 'negative' });
        }
    } catch (error) {
        console.error('Error adding item to cart:', error);
        return res.json({ message: 'Error adding item to cart.', type: 'negative' });
    }
});

module.exports = router;
