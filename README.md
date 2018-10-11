# Emojinizer - Serverless SMS/MMS demo

This is not an official Google product. This is a cobbled-together demo app.

Text a given phone number and get a Natural Language sentiment
analysis on your text, (😄 or 😔 emoji), or if you text an image
it'll replace faces showing certain expressions with the
appropriate emoji (surprise, joy, anger, and sadness).

An end-to-end serverless app using Google Cloud Functions,
Firebase, BigQuery and Twilio.

## Prerequisites
- A Google Cloud Platform account
- A Firebase account
- A Twilio account with a phone number with SMS capability

## Installation
### Enable APIs
1. [Enable needed GCP APIs](https://console.cloud.google.com/flows/enableapi?apiid=cloudfunctions,language.googleapis.com,storage_api,vision.googleapis.com)

### Google Cloud Functions
1. From project root, ```$ cd cloud-functions```
1. Copy ```config.js.template``` to ```config.js``` and populate fields.
1. [Download a service account from the Firebase Console](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) and save it
as ```firebase-service-account.json```.
1. [Download a Google Cloud Platform service account](https://console.cloud.google.com/iam-admin/serviceaccounts/) and save it as ```keyfile.json```.
1. (Optional) Install dependencies

   ```$ npm install```
#### Deploy the Cloud Function
1. ```$ gcloud config set project <project_id>```
1. ```$ gcloud beta functions deploy smsNL ---trigger-http```

### Firebase
1. From project root, ```$ cd visualizer/```
1. Copy ```public/config.js.template``` to ```public/config.js``` and
populate fields.
1. Run ```$ firebase serve``` to show the visualizer locally, or
```$ firebase deploy``` to publish to the internet.

### Configure Twilio
- In your [Twilio Phone numbers dashboard](https://www.twilio.com/console/phone-numbers/):
  - Navigate to *Messaging* / *A Message Comes In*
  - Set to **Webhook**
  - Change URL to your Cloud Function, and append the BigQuery table name (created in the next step), e.g. `https://us-central1-my-project-here.cloudfunctions.net/smsNL?bq=bigquery_table_name_here`
  - Set to **HTTP GET**

## BigQuery
### Create BigQuery table
Create your table with the following schema, and make sure it has the same
name as in ```config.js```:
- message_text	STRING	NULLABLE	
- event_name STRING NULLABLE
- tokens	STRING	NULLABLE	
- score	STRING	NULLABLE	
- magnitude	STRING	NULLABLE	
- from_city	STRING	NULLABLE	
- from_country	STRING	NULLABLE	
- timestamp	INTEGER	NULLABLE

### BigQuery queries
#### Positive/negative sentiment.
```sql
SELECT
  COUNT(CASE WHEN float(score) > 0 THEN 1 END) as pos_count, 
  COUNT(CASE WHEN float(score) < 0 THEN 1 END) as neg_count
FROM [gcp_project:sms.messages]
```

#### Query for emojis
```sql
SELECT 
  COUNT(*) as cnt, emoji
FROM 
  JS(
    (SELECT tokens FROM [gcp_project:sms.messages]),
    tokens,
    "[{ name: 'emoji', type: 'string'}]",
    "function(row, emit) { 
      try {
        x = JSON.parse(row.tokens);
        
        x.forEach(function(token) {
          if ((token.text.content.length == 2) && (token.text.content.charCodeAt(0) === 55357)) {
            emit({ emoji: token.text.content });
          }
        });
      } catch (e) {}
    }" 
  )
GROUP BY emoji
ORDER BY cnt DESC
```

#### Most texted adjectives
```sql
SELECT COUNT(*) as adj_count, adjective
FROM 
 JS(
 (SELECT tokens FROM [gcp_project:sms.messages]),
 tokens,
 "[{ name:'adjective', type: 'string'}]",
 "function(row, emit) { 
   try {
     x = JSON.parse(row.tokens);
     x.forEach(function(token) {
       if (token.partOfSpeech.tag === 'ADJ') {
         emit({ adjective: token.lemma.toLowerCase() });
       }
     });
   } catch (e) {}
 }" 
 )
GROUP BY adjective
ORDER BY adj_count DESC
LIMIT 100
```
  
Direct any questions to [@bretmcg](https://www.twitter.com/@bretmcg).
