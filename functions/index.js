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

exports.sms = functions.https.onRequest((req, res) => {
  console.log('smsWebhook');
  const twilio = require('twilio');
  const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  console.log(req.body);
  let body = req.body;
  let sms = {
    userNumber: body.From,
    country: body.FromCountry,
    city: body.FromCity,
    twilioNumber: body.To,
    text: body.Body
  }
  let bqTable = body.event || process.env.BQ_TABLE;

  twilioClient.messages.create({
    body: 'Back atcha: ' + sms.text,
    to: sms.userNumber,
    from: sms.twilioNumber
  })
  .then(message => {
    // console.log(message);
    console.log(message.sid);
    return admin.database().ref('/messages').push({text: sms.text})
  }).then(() => {
    return res.status(200).send('OK/1');
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
