require('dotenv').config();


const BigQuery = require('@google-cloud/bigquery');
const bigquery = new BigQuery();
const Filter = require('bad-words');
const filter = new Filter();
const functions = require('firebase-functions');
const Language = require('@google-cloud/language');
const languageClient = new Language.LanguageServiceClient();
const admin = require('firebase-admin');
admin.initializeApp(); // Firebase RTDB.

exports.smsWebhook = functions.https.onRequest((req, res) => {
  console.log('smsWebhook');
  console.log('process.env.TWILIO_ACCOUNT_SID', process.env.TWILIO_ACCOUNT_SID);
  console.log('process.env.TWILIO_AUTH_TOKEN', process.env.TWILIO_AUTH_TOKEN);
  const twilio = require('twilio');
  const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  twilioClient.messages.create({
    body: 'Howdy',
    to: '+19794927261',
    from: process.env.TWILIO_PHONE_NUMBER
  })
  .then(message => {
    console.log(message);
    console.log(message.sid);
    return admin.database().ref('/messages').push({text: message.sid})
  }).then(() => {
    return res.status(200).send('OK');
  })
  .catch(err => {
    console.error(err);
    return res.status(500).send('An error has occured.');
  });
  // let sms = {
  //   from: req.body.from,
  //   text: req.
  // };
  // let fromNumber = req.query.From;
	// let text = req.query.Body;
	// let fromCountry = req.query.FromCountry;
	// let fromCity = req.query.FromCity;
	// let twilioNumber = req.query.To || config.twilio.phoneNumber;
	// let bqTableName = req.query.bq || config.defaultBqTableName;
  // response.send("Hello from Firebase!");
});
