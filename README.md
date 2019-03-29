## retweet-bot
A script for retweeting tweets using Twit for communication with Twitter's API

### config.js
Consumer & access keys for Twitter's API go here

### queries.js
A string array used by Twit's NPM package for building queries. Script loops through this array and retweet's the most recent hit for each query at a dynamic interval

### data.json
If a request returns a tweet, it's text value is then hashed using bcrypt NPM package, and stored statically using flatfile NPM package
Hashed tweets are stored as JSON data, with the key being the query name, and value the hashed tweet.
MAKE SURE TO DEFINE YOUR KEYS IN THIS FILE, the value doesn't matter.
