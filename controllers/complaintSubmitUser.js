// npm install nodemailer

const nodemailer = require('nodemailer');

async function complaintSubmit(complaintData, email, complaintId, retryCount = 2, delayBetweenRetries = 2000) {
  async function send() {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'carecool.info@gmail.com',
        pass: 'ydujmdpfymexuwly'
      }
    });


// Final mail options with dynamic rows and subtotal
const mailOptions = {
  from: 'carecool.info@gmail.com',
  to: email,
  subject: 'Complaint received!',
  html: `
      <p>We received your complaint for ${complaintData.reason}. Kindly wait, we will processed your complaint soon.</p>
      <p>Complaint ID: ${complaintId} </p>
     
      <h4>From GrosCool</h4>
  `
};


    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
      
    } catch (error) {
      console.log(error);

      if (retryCount > 0) {
        console.log(`Retrying in ${delayBetweenRetries / 1000} seconds...`);
        setTimeout(async () => {
          await complaintSubmit(complaintData, email, complaintId, retryCount - 1, delayBetweenRetries = 2000);
        }, delayBetweenRetries);
      } else {
        console.log('Maximum retry count reached. Email not sent.');
        return false;
      }
    }
  }

  await send();
}

module.exports = {
    complaintSubmit : complaintSubmit,
};
