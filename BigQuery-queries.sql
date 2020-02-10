-- View messages
-- SELECT 1

-- +/- messages.
-- SELECT
--   COUNT(CASE WHEN float(score) > 0 THEN 1 END) as pos_count,
--   COUNT(CASE WHEN float(score) < 0 THEN 1 END) as neg_count
-- FROM
--   [emojinizer:emojinizer.messages]
-- WHERE
--   event_name = (select event_name from [emojinizer:emojinizer.messages] order by timestamp desc LIMIT 1)









-- Emojis
-- SELECT
--   COUNT(*) as cnt, emoji
-- FROM 
--   JS(
--     (SELECT tokens FROM [emojinizer:emojinizer.messages]
--       WHERE event_name=(select event_name from [emojinizer:emojinizer.messages] order by timestamp desc LIMIT 1)),
--     tokens,
--     "[{ name: 'emoji', type: 'string'}]",
--     "function(row, emit) { 
--       try {
--         x = JSON.parse(row.tokens);
        
--         x.forEach(function(token) {
--           if ((token.text.content.length == 2) && (token.text.content.charCodeAt(0) === 55357)) {
--             emit({ emoji: token.text.content });
--           }
--         });
--       } catch (e) {}
--     }" 
--   )
-- GROUP BY emoji
-- ORDER BY cnt DESC




-- Most texted adjectives.
-- SELECT COUNT(*) as adj_count, adjective
-- FROM 
--  JS(
--  (SELECT tokens FROM [emojinizer:emojinizer.messages]
--        WHERE event_name=(select event_name from [emojinizer:emojinizer.messages] order by timestamp desc LIMIT 1)),
--  tokens,
--  "[{ name:'adjective', type: 'string'}]",
--  "function(row, emit) { 
--    try {
--      x = JSON.parse(row.tokens);
--      x.forEach(function(token) {
--        if (token.partOfSpeech.tag === 'ADJ') {
--          emit({ adjective: token.lemma.toLowerCase() });
--        }
--      });
--    } catch (e) {}
--  }" 
--  )
-- GROUP BY adjective
-- ORDER BY adj_count DESC
-- LIMIT 100


-- View messages
SELECT * FROM [emojinizer:emojinizer.messages] 
  WHERE event_name=(select event_name from [emojinizer:emojinizer.messages] order by timestamp desc LIMIT 1)
