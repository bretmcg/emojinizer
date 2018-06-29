/**
 * @license
 * Copyright 2018, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 require('dotenv').config();
const BigQuery = require('@google-cloud/bigquery');
const Filter = require('bad-words');
const filter = new Filter();
const functions = require('firebase-functions');
const Language = require('@google-cloud/language');
const emojify = require('./lib/emojify');
const admin = require('firebase-admin');
admin.initializeApp(); // Firebase RTDB.


// Saves a message to the Firebase Realtime Database but sanitizes the text by removing swearwords.
exports.resetVisualizer = functions.https.onCall((data, context) => {
  // Message text passed from the client.
  const eventName = data.eventName;
  if (!eventName) {
    console.warn('No event name supplied, exiting');
    return Promise.resolve({ reset: false, event: 'none' });
  }

  console.log(`Resetting visualizer for ${eventName}...`);
  return admin.database().ref('/messages').child(eventName)
    .set({})
    .then(() => {
      return { reset: true, event: eventName };
    }).catch(err => {
      console.error(err);
      return { reset: false, event: eventName, error: err };
    });
});


var sms = functions.https.onRequest((req, res) => {
  const languageClient = new Language.v1.LanguageServiceClient();
  console.log('smsWebhook');

  let body = req.body;
  console.log(body);
  let msg = {
    userNumber: body.From,
    country: body.FromCountry,
    city: body.FromCity,
    twilioNumber: body.To,
    text: filter.clean(body.Body),
    event: body.event || body.To
  };

  if (emojify.hasImage(body)) {
    console.log('Media attached to message, running face emojify.');
    return emojify.emojify(body)
      .then((mediaUrl) => {
        let message = `Here's your emoji-me photo. Giddy up!`;
        if (!mediaUrl) {
          message = `There was a problem finding faces in your photo.`
        } else {
          saveToFirebase({ imageUrl: mediaUrl }, msg.event);
        }

        return sendReplyText(msg.userNumber, msg.twilioNumber, message , mediaUrl);
      })
      .then(() => {
        return res.status(200).send('Done');
      })
      .catch(e => {
        console.error(e);
        return res.status(500).send('An error has occured');
      });
  }
  console.log(`Plain text sms: "${msg.text}" sent from ${msg.userNumber}, ${msg.country},${msg.city}, saving to ${msg.event}`);

  // msg.text = "'Lawrence of Arabia' is a highly rated film biography about British Lieutenant T. E. Lawrence. Peter O'Toole plays Lawrence in the film.";

  const document = {
    content: msg.text,
    type: 'PLAIN_TEXT'
  };
  var features = {
    extractSyntax: true,
    extractEntities: false,
    extractDocumentSentiment: true,
    extractEntitySentiment: false,
    classifyText: msg.text.split(' ').length > 19,
  };
  const request = {
    document: document,
    features: features,
    encodingType: 'UTF8'
  };
  return languageClient.annotateText(request)
    .then(data => {
      let sentiment = data[0].documentSentiment;
      msg.score = sentiment.score;
      msg.magnitude = sentiment.magnitude;
      msg.tokens = data[0].tokens || {};
      msg.emoji = getEmoji(sentiment.score);
      return console.log(`${msg.emoji} - ${msg.text} - ${sentiment.score}`);
    })
    .then(() => {
      let analysis = `Based on your message, you seem ${msg.emoji}`;
      return sendReplyText(msg.userNumber, msg.twilioNumber, analysis);
    })
    .then(() => saveToFirebase({ emoji: msg.emoji, tokens: msg.tokens }, msg.event))
    .then(() => saveToBigQuery(msg))
    .then(() => {
      return res.status(200).send('Done');
    })
    .catch(err => {
      console.log(new Error(err));
      return res.status(500).send('An error has occured: ' + err);
    });
}); //end sms


/**
 * Returns an emoji (happy/sad/neutral) based on sentiment.
 * @param {number} score Sentiment score from -1 to 1.
 * @returns {string} Emoji character.
 */
var getEmoji = function (score) {
  if (score > -0.3 && score < 0.3) {
    return '😐'; // neutral
  } else if (score <= -0.3) {
    return '😔'; // sad
  }

  return '😄'; // happy
};

var sendReplyText = function (toNumber, twilioNumber, message, mediaUrl) {
  const twilio = require('twilio');
  const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient.messages.create({
      body: message,
      to: toNumber,
      from: twilioNumber,
      mediaUrl: mediaUrl
    })
    .then(message => {
      return console.log(`Message ${message.sid} sent.`);
    })
    .catch(err => {
      // Swallow this error so we can save to BQ even if the text fails.
      return console.error(err);
    });
};

var saveToBigQuery = function (msgData) {
  const bigquery = new BigQuery();
  console.log(`Saving to BigQuery: ${process.env.BQ_DATASET}.${process.env.BQ_TABLE}`);
  const bqTable = bigquery.dataset(process.env.BQ_DATASET).table(process.env.BQ_TABLE);
  let row = {
    message_text: msgData.text,
    event_name: msgData.event,
    tokens: JSON.stringify(msgData.tokens),
    score: (msgData.score).toString(),
    magnitude: (msgData.magnitude).toString(),
    from_city: msgData.city,
    from_country: msgData.country,
    timestamp: Date.now()
  };
  return bqTable.insert(row); // return a Promise.
};

var saveToFirebase = function (payload, eventName) {
  return new Promise((resolve) => {
    console.log('Saving to Firebase for visualizer');
    console.log(`*** saving to ${eventName}`);
    console.log(JSON.stringify(payload));
    // Save to Firebase: write to /sms/tablename
    admin.database().ref('/messages')
      .child(eventName)
      .push(payload)
      .catch((error) => {
        // Don't fail the promise on error because we want to continue.
        console.error(error);
        resolve();
    });
    resolve();
  });
};

exports.sms = sms;
