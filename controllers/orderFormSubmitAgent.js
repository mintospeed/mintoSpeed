// npm install nodemailer

const nodemailer = require('nodemailer');

async function orderFormSubmit(orderItems, orderData, orderId, errorForAdmin, logsForAdmin, retryCount = 2, delayBetweenRetries = 2000) {
  async function send() {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'carecool.info@gmail.com',
        pass: 'ydujmdpfymexuwly'
      }
    });


let rows = '';
let errorForAdminVal = '';
if(errorForAdmin.length > 0){
  errorForAdminVal += "Error : ";
  for(let i = 0; i < errorForAdmin.length; i++){
    errorForAdminVal += `<p style="margin: 5px; font-size: 13px; color: red;">${errorForAdmin[i]}</p>`;
  }
}
console.log("errorForAdmin  : " + errorForAdminVal);
let logsForAdminVal = '';
if(logsForAdmin.length > 0){
  logsForAdminVal += "Logs : ";
  for(let i = 0; i < logsForAdmin.length; i++){
    logsForAdminVal += `<p style="margin: 5px; font-size: 13px; color: black;">${logsForAdmin[i]}</p>`;
  }
}
console.log("logsForAdmin  : " + logsForAdminVal);


orderItems.forEach((orderItems) => {
  rows += `
      <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${orderItems.name}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${orderItems.quantity}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">₹${orderItems.price}</td>
      </tr>
  `;
});

// Final mail options with dynamic rows and subtotal
const mailOptions = {
  from: 'carecool.info@gmail.com',
  to: 'scifi124421@gmail.com',
  subject: 'Someone request an order',
  html: `
      <h3>Order details are:</h3> 
      ${errorForAdminVal}
      ${logsForAdminVal}
      <p>Order ID: ${orderId} </p>
      <p>
          Name: ${orderData.fullName} <br>
          Mobile: ${orderData.phone} <br>
          Email: ${orderData.email} <br>
          Address: ${orderData.streetAddress + " " + orderData.city + " " + orderData.district + ", " + orderData.state + " " + orderData.pincode} <br>
          Date & Time: ${orderData.dateTime} <br>
          UserId: ${orderData.orderUserId} <br>

      </p>
      <br />
      
      <h4>Order Items</h4>
      <table style="width: 100%; border-collapse: collapse;">
          <thead>
              <tr>
                  <th style="border: 1px solid #ccc; padding: 8px;">Item Name</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">Quantity</th>
                  <th style="border: 1px solid #ccc; padding: 8px;">Price</th>
              </tr>
          </thead>
          <tbody>
              ${rows}
          </tbody>
          <tfoot>
              <tr>
                  <td colspan="2" style="border: 1px solid #ccc; padding: 8px; text-align: right;">Subtotal</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">₹${orderData.orderTotalPrice.toFixed(2)} (${orderData.orderTotalItems} items)</td>
              </tr>
          </tfoot>
      </table>

      <p>
          See order details: 
          <a href="/dashboard/pendingOrders?orderId=${orderId}">See Order Details</a>
      </p>
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
          await orderFormSubmit(orderItems, orderData, orderId, errorForAdmin, logsForAdmin, retryCount - 1, delayBetweenRetries = 2000);
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
    orderFormSubmit : orderFormSubmit,
};
