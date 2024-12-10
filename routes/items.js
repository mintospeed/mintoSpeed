const express = require('express');
const router = express.Router();
// Import and configure dayjs with customParseFormat
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const fetchSectionQuantity = 2;

const setCartCookie = require('../middlewares/cartCookie');

// Route to render initial grocery page with EJS
router.get('/', setCartCookie, async (req, res) => {
    const firestore = req.firestore;
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    const queryCategory = req.query.i;
    let totalCartItem = req.totalCart || 0;
    let selectedCategory = [];
    const signedUser = req.cookies.userId ? 'true' : 'false';
    let documentIds = [];


    if(!queryCategory){
        return res.redirect('/');
    }
    if ((/[.#\[\]$<>\/]/.test(queryCategory))) {
        return res.redirect('/');
    }
    console.log("query i : " + queryCategory);
    const favName = capitalize(queryCategory);

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
         // Fetch selected category
        const categorySnapshot = await firestore.collection('items').doc(queryCategory).get();
 
        const subcategory = await fetchFirstSubcategoryWithItems(req, res, categorySnapshot, firestore);
        selectedCategory.push({
            id: queryCategory,
            subcategory
        });
         
        try {
            const categoriesSnapshot = await firestore.collection('items').limit(fetchSectionQuantity).get();
            let initialCategories = [];
    
            for (const categoryDoc of categoriesSnapshot.docs) {
                const categoryName = categoryDoc.id;
                if(categoryName != queryCategory){
                    const subcategories = await fetchFirstSubcategoryWithItems(req, res, categoryDoc, firestore);
                    initialCategories.push({
                        id: categoryName,
                        subcategories
                    });                
                }    
            }
    
            return res.render('items', { nonce: res.locals.nonce, activePage: 'items', favName, user: signedUser, totalCart: totalCartItem, categories: initialCategories, selectedCategory: selectedCategory, categoryNames: documentIds  });
        } catch (error) {
            console.error('Error fetching categories:', error);
            return res.render('items', { nonce: res.locals.nonce, activePage: 'items', favName, user: signedUser, totalCart: totalCartItem, selectedCategory: selectedCategory, categoryNames: documentIds  });
        }
    } catch (error) {
        console.error('Error fetching categories2:', error);
        return res.render('items', { nonce: res.locals.nonce, activePage: 'items', favName, user: signedUser, totalCart: totalCartItem, categories: initialCategories, categoryNames: documentIds  });
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
    console.log("load more Items called items");

    try {
        const firestore = req.firestore;
        const { lastVisible, headCategoryName } = req.body; // Get lastVisible from request body

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
            if(categoryName != headCategoryName){
                const subcategories = await fetchFirstSubcategoryWithItems(req, res, categoryDoc, firestore);
                additionalCategories.push({
                    id: categoryName,
                    subcategories
                });
            }
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

function capitalize(text) {
    if (!text) return ''; // Handle empty or undefined input
    return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = router;
