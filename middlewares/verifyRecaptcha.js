const axios = require('axios');

module.exports = async (req, res, next) => {
    
    const token = req.body.token;
    if(!token){
        return res.json({ message: 'Recaptcha not found. Please try again.', type: 'negative' });
    }

    try {
        // Verify the token with Google's API
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify`,
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SITE_KEY,
                    response: token,
                },
            }
        );

        const { success, score } = response.data;

        if (success && score > 0.5) {
            console.log("score : " + score);
            req.captchaScore = score;
            return next();
        } else {
            return res.json({ message: 'Recaptcha failed. Try again.', type: 'negative' });
        }
    } catch (error) {
        console.error(error);
        return res.json({ message: 'Recaptcha verifcation failed. Try again.', type: 'negative' });
    }
   
};