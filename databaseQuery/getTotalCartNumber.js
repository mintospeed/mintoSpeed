
const getTotalCartItems = async (firestore, userId) => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);  // Calculate date for 7 days ago

    try {
        const cartItemsSnapshot = await firestore
            .collection("cart")
            .doc(userId)
            .collection("cartItems")
            .where("dateTime", ">=", lastWeek)  // Filter by the last 7 days
            .get();

        const totalCartItems = cartItemsSnapshot.size;  // Get the count of documents

        console.log('totalCartItems inside function:', totalCartItems); // Check the actual value

        return totalCartItems;
    } catch (error) {
        console.error("Error retrieving cart items: ", error);
        console.log('totalCartItems inside function: 0'); // Check the actual value
        return 0;
    }
};


module.exports = { getTotalCartItems };
