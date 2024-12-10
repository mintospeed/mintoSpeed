// npm install nodemailer

const nodemailer = require('nodemailer');

async function orderFormSubmit(orderItems, orderData, orderId, retryCount = 2, delayBetweenRetries = 2000) {
  async function send() {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'carecool.info@gmail.com',
        pass: 'ydujmdpfymexuwly'
      }
    });


let rows = '';

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
  to: orderData.email,
  subject: 'Order Details',
  html: `
      <h3>Your order details are:</h3> 
      <p>Order ID: ${orderId} </p>
      <p>
          Name: ${orderData.fullName} <br>
          Mobile: ${orderData.phone} <br>
          Email: ${orderData.email} <br>
          Address: ${orderData.streetAddress + " " + orderData.city + " " + orderData.district + ", " + orderData.state + " " + orderData.pincode}
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
          Go to profile: 
          <a href="/profile">Go To Profile</a>
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
          await orderFormSubmit(orderItems, orderData, orderId, retryCount - 1, delayBetweenRetries = 2000);
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
