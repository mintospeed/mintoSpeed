// utility.js


// Utility to convert kg/gm to grams
function convertToGrams(value) {
    if (typeof value === 'string' && value.includes('kg')) {
        return parseFloat(value) * 1000;
    } else {
        return parseInt(value);
    }
}

// Utility function to convert a weight string to grams
function convertToGrams2(weightText) {
    const [amount, unit] = weightText.split(' ');
    let value = parseFloat(amount);
    if (unit.toLowerCase() === 'kg') {
        return value * 1000; // Convert kg to grams
    } else if (unit.toLowerCase() === 'gm' || unit.toLowerCase() === 'g') {
        return value; // Already in grams
    }
    return value;
}

function generateUniqueId(length) {
    // Ensures we have access to the crypto API
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
        throw new Error("Crypto API not available");
    }

    // Characters to include in the ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';

    // Add a timestamp component to ensure time-based uniqueness
    let timestamp = Date.now();
    console.log("timestamp : " + timestamp);
    // const date = new Date(timestamp);
    // console.log("date : " + date.toString()); //to get real datetime
    timestamp = timestamp.toString(36)  // Convert current timestamp to base36
    id += timestamp;

    // Fill remaining length with random characters
    const randomLength = length - timestamp.length;
    console.log("randomLength : " + randomLength);

    const randomArray = new Uint8Array(randomLength);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < randomLength; i++) {
        id += chars[randomArray[i] % chars.length];
    }

    return id;
}

function getClosestWeightAndPrice(inputData, itemData) {

    let options = JSON.parse(itemData.options);

    if (itemData.packed === "false" || itemData.packed == false) {
        if (options.length === 0) {
            console.log("err 1");
            return { price: 0, message: "No options available" };
        }
        const minVol = convertToGrams2(itemData.min);
        const maxVol = convertToGrams2(itemData.max);
        console.log("getClosestWeightAndPrice");

        let selectedWeight = inputData;
        let targetWeight = convertToGrams2(selectedWeight); // Convert inputData like "1 kg" or "500 gm" to grams

        let closestWeight = null;
        let closestPrice = null;
        let closestDifference = Infinity;

        // Loop through all the weight and price options
        options.forEach(option => {
            let weight = convertToGrams2(option.weight); // Convert weight text like "100 gm" to a number in grams
            let price = parseFloat(option.price); // Get the corresponding price

            // Calculate the difference between the target weight and the current option weight
            let difference = Math.abs(targetWeight - weight);

            // If this is the closest weight so far, update the closest weight and price
            if (difference < closestDifference) {
                closestDifference = difference;
                closestWeight = weight; // Store the closest weight in grams
                closestPrice = price;   // Store the corresponding price
            }
        });

        let rate = closestPrice / closestWeight;
        let newPrice = (rate * targetWeight).toFixed(2);
        console.log("newPrice : " + newPrice);


        // Check if the target weight is within the allowed volume range
        if (targetWeight >= minVol && targetWeight <= maxVol) {
            return newPrice;
        } else {
            return 0;
        }
    } else if (itemData.packed === "true" || itemData.packed == true) {
        const minVol = parseInt(itemData.min);
        const maxVol = parseInt(itemData.max);

        const itemQty = parseInt(itemData.qty); // Assuming quantity is provided in itemData
        const itemPriceforQty = parseFloat(itemData.price); // Assuming price is provided in itemData for packed items
        const rate = itemPriceforQty / itemQty;
        let newPrice = (rate * inputData).toFixed(2);
        console.log("newPrice : " + newPrice);


        if (inputData >= minVol && inputData <= maxVol) {
            return newPrice;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}




// Export all functions
module.exports = {
    convertToGrams,
    generateUniqueId,
    convertToGrams2,
    getClosestWeightAndPrice
};
