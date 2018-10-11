// Usage: node test.js "Message here"
// Make sure .env file is populated first.

// TODO: turn these into parameters.
const toNumber = '';
const fromNumber = '';
const msg = process.argv[2] || "This is a test message";

require('dotenv').config()

var accountSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;

var twilio = require('twilio');
var client = new twilio(accountSid, authToken);

client.messages.create({
    body: msg,
    to: toNumber,
    from: fromNumber
})
.then((message) => console.log(message.sid))
.catch((e) => {
  console.error(e);
});
