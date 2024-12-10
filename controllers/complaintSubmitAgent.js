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

    let userId = '';
    if(complaintData.userId){
        userId = complaintData.userId
    }


// Final mail options with dynamic rows and subtotal
const mailOptions = {
  from: 'carecool.info@gmail.com',
  to: 'scifi124421@gmail.com',
  subject: 'Complaint received from customer',
  html: `
      <h3 style="text-transform: capitalize;">${complaintData.reason}</h3>
      <p>Complaint ID: ${complaintId} </p>
      <p>Details: ${complaintData.detail} </p> 
      <p>User email: ${email} </p>
      <p>UserId: ${userId} </p>
      <p>dateTime: ${complaintData.dateTime} </p> 

     
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
