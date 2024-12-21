const admin = require("firebase-admin");

module.exports = (req, res, next) => {
    const userId = req.cookies.userId;

    console.log('userId Header:', userId); // Log the header

    if (!userId) {
        return res.redirect('/auth/login');
    }

    try {
        admin.auth().getUser(userId)
            .then((userRecord) => {
                console.log("Successfully fetched user data:", userRecord.toJSON());
                req.userId = userId;
                return next();                  
            })
            .catch((error) => {
                console.error("Error fetching user data validation:", error);
                return res.redirect('/auth/login');
            });
    } catch (error) {
        return res.redirect('/auth/login');
    }
};