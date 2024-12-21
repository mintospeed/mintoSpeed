const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);
const { generateUniqueId, getClosestWeightAndPrice } = require('../utilities/utility');
let twoMonthsAgo = new Date();
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2); // Go back 2 months
const validateUser = require('../middlewares/validateUser');


router.get('/', async (req, res) => {
    let userId = req.cookies.userId;
    let tempId = req.cookies.tempId;
    let totalCartItem = 0;;
    const signedUser = req.cookies.userId ? 'true' : 'false';


    // If no user ID or temp ID, return empty cart
    if (!userId && !tempId) {
        totalCartItem = 0;
        return res.render('cart', { nonce: res.locals.nonce, activePage: 'cart', user: signedUser, totalCart: totalCartItem, cartDetails: [], message: "No cart found." });
    } else if (!userId && tempId) {
        userId = tempId;
    }

    let cartItemsData = [];

    req.firestore.collection("cart")
        .doc(userId)
        .collection("cartItems")
        .where("dateTime", ">=", twoMonthsAgo) // Filter by the last 2 month
        .orderBy("dateTime", "desc") // Order by dateTime in descending order
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                console.log("No cart items found.");
            } else {
                querySnapshot.forEach((doc) => {
                    const itemData = doc.data();
                    itemData.cartItemId = doc.id; // Attach the cart item key as cartItemId
                    cartItemsData.push(itemData);
                    console.log("Retrieved item data:", itemData);
                });
            }
        })
        .catch((error) => {
            console.error("Error retrieving documents: ", error);
        })
        .then(async () => {
            if (cartItemsData.length === 0) {
                return res.render('cart', {
                    nonce: res.locals.nonce,
                    activePage: 'cart',
                    user: signedUser,
                    totalCart: 0,
                    cartDetails: [],
                    message: "No cart found."
                });
            }

            const cartDetailsPromises = await getCartDetails(cartItemsData, req);

            const cartDetails = (await Promise.all(cartDetailsPromises)).filter(item => item !== null);
            const totalCartItem = cartDetails.length;

            return res.render('cart', {
                nonce: res.locals.nonce,
                activePage: 'cart',
                user: signedUser,
                totalCart: totalCartItem,
                cartDetails: cartDetails,
                message: ''
            });
        })
        .catch((error) => {
            console.error("Error processing cart items:", error);
        });
});


//proceed and update cart
router.post('/proceed-cart-items', validateUser, async (req, res) => {
    try {
        const { items, selectedCartItemIds } = req.body; // Capture selectedCartItemIds from request body
        let userId = req.userId;

        if (!userId) {
            return res.redirect('/auth/login');
        }   

        const firestore = req.firestore;
        let updatedItemIds = [];
        let totalPrice = 0;
        let totalItems = 0;
        console.log("proceed-cart-items");

        // update item in cart
        if (items != null && items.length != 0) {
            for (const item of items) {
                const { id, date, weight, quantity } = item;
                console.log("items update : " + id + date + weight + quantity);

                if (!id) {
                    console.warn("Skipping item with missing ID:", item);
                    continue;
                }

                const cartItemRef = firestore.collection('cart')
                    .doc(userId)
                    .collection('cartItems')
                    .doc(id);

                const updateData = {};
                if (weight !== undefined) updateData.volume = weight;
                if (quantity !== undefined) updateData.qty = quantity;

                try {
                    await cartItemRef.update(updateData);
                    updatedItemIds.push(id); // Track successful update
                } catch (updateError) {
                    console.error(`Error updating item ID ${id}:`, updateError);
                    return res.json({ success: "negative", message: `Something went wrong to update your changes. Please try again.` });
                }
            }
        }

        if (!selectedCartItemIds || selectedCartItemIds.length === 0) {
            return res.json({ success: "negative", message: 'No selected item found.' });
        }
        else {
            for (let cartId of selectedCartItemIds) {
                const cartItemRef = firestore.collection('cart')
                    .doc(userId)
                    .collection('cartItems')
                    .doc(cartId);

                const doc = await cartItemRef.get();
                console.log("proceed-cart-items selectedCartItemIds");


                if (doc.exists) {
                    const cartData = doc.data();
                    console.log("proceed item data :", cartData);
                    const { category, subCategory, name, volume, qty } = cartData;
                    console.log(`Processing cart item: ${name}, Volume: ${volume}, Qty: ${qty}`);

                    // Reference to the item in Firestore
                    const itemRef = req.firestore.collection('items').doc(category).collection(subCategory).doc(name);
                    const itemSnapshot = await itemRef.get();

                    if (!itemSnapshot.exists) {
                        return res.json({ success: "negative", message: 'Item not found. Please try again.' });
                    }

                    const itemData = itemSnapshot.data();

                    totalPrice += getClosestWeightAndPrice(volume, itemData) * qty;
                    totalItems += 1;
                    console.log("totalPrice " + totalPrice);

                } else {
                    console.warn(`Cart item with ID ${cartId} does not exist.`);
                }
            }


            const orderData = {
                items: selectedCartItemIds,
                totalPrice: totalPrice,
                totalItems: totalItems,
                userId: userId,
                dateTime: new Date().toLocaleString()
            };

            try {
                const orderId = generateUniqueId(10);

                const orderRef = req.database.ref(`tempOrder/${orderId}`);
                await orderRef.set(orderData);

                return res.json({
                    success: "positive", redirectUrl: `/orderForm?tempOrderId=${orderId}`
                });

            } catch (error) {
                console.error('Error storing order:', error);
                return res.json({ success: "negative", message: 'Error to store order data. Please try again.' });
            }

        }


    } catch (error) {
        console.error('Unexpected error in update-cart-items:', error);
        return res.json({
            success: "negative",
            message: 'An unexpected error occurred while proceeding cart items. Please try again.'
        });
    }
});






// Define a function to retrieve and process cart details
async function getCartDetails(cartItemsData, req) {
    return await Promise.all(cartItemsData.map(async (cartItem) => {
        const { category, subCategory, name, volume, qty } = cartItem;
        console.log(`getCartDetails : ${name}, Volume: ${volume}, Qty: ${qty}`);

        // Reference to the item in Firestore
        const itemRef = req.firestore.collection('items').doc(category).collection(subCategory).doc(name);
        const itemSnapshot = await itemRef.get();

        // If item data does not exist, return null to skip it
        if (!itemSnapshot.exists) {
            return res.json({ success: "negative", message: 'Item not found. Please try again.' });
        }

        const itemData = itemSnapshot.data();

        // Assuming getClosestWeightAndPrice is a defined function
        const totalPrice = getClosestWeightAndPrice(volume, itemData);

        // Return the structured item data
        return {
            date: cartItem.date,
            cartItemId: cartItem.cartItemId,
            name: name,
            volume: volume,
            qty: qty,
            imageUrl: itemData.img,
            price: totalPrice,
            category: category,
            subCategory: subCategory,
            packed: itemData.packed,
            minVolume: itemData.min,
            maxVolume: itemData.max,
            options: JSON.parse(itemData.options) || []
        };
    }));
}



module.exports = router;