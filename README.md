# emojinizer
Emoji analysis of language, etc using serverless tools on Google Cloud

## References
- Pixelbook image from https://www.google.com/chromebook/device/google-pixelbook/

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
