const { parse } = require('date-fns');

// Function to get the current date in DD-MM-YYYY format
function getCurrentDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Function to get the current time in HH:MM:SS format
function getCurrentTime() {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}



//"2024-11-24T23:21" to "24/11/2024, 11:21:00 pm"
function formatDateTime(dateTimeString) {
    // Create a new Date object
    const date = new Date(dateTimeString);
  
    // Format date components
    const day = String(date.getDate()).padStart(2, '0'); // Day of the month (2 digits)
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month (0-indexed, so +1)
    const year = date.getFullYear(); // Full year
    
    // Format time components
    let hours = date.getHours(); // Hours in 24-hour format
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Minutes (2 digits)
    const seconds = String(date.getSeconds()).padStart(2, '0'); // Seconds (2 digits)
    
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight (0 -> 12)
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

//convert firestore timestramp into string
function timestampIntoString(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return ""; // Return  for invalid inputs
    }

    const date = timestamp.toDate();

    const formattedDate = date.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',     // Set the timezone (UTC+5:30 for IST)
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });

    return formattedDate;
}

function dateTimeForRealTimeDatabase(now) {
    const indiaDateTime = now.toLocaleString("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // Use 12-hour format to include AM/PM
    });

    console.log(indiaDateTime); // Example: "16/11/2024, 06:30:00 PM"
    return indiaDateTime;
}


//sort data according to newest first
function sortDateTimeForRealTimeDatabase(date) {
    const format = "dd/MM/yyyy, hh:mm:ss a"; // 'a' for AM/PM

    // Preprocess function to convert "00" to "12" for AM/PM times
    function preprocessTime(orderTime) {
        return orderTime.replace(/, 00:/, ", 12:"); // Replace '00:' with '12:'
    }

    date.sort((a, b) => {
        const timeA = preprocessTime(a.orderTime);
        const timeB = preprocessTime(b.orderTime);

        const dateA = parse(timeA, format, new Date());
        const dateB = parse(timeB, format, new Date());

        if (isNaN(dateA) || isNaN(dateB)) {
            console.error("Invalid date parsing for:", timeA, timeB);
            return 0; // Keep original order if parsing fails
        }

        return dateB - dateA; // Sort in descending order (newest first)
    });
}


// Export all functions
module.exports = {
    getCurrentDate,
    getCurrentTime,
    formatDateTime,
    timestampIntoString,
    dateTimeForRealTimeDatabase,
    sortDateTimeForRealTimeDatabase
};