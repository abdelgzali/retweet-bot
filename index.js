// Twitter bot for retweeting tweets based on a string array
// Uses Twit NPM package to communicate with Twitter API
// A function loops through an array of strings, generating a query for each, and using it to request the most recent tweet from the API
// Once the tweet object is returned, a post function is called which sends a retweet request using the tweet object's id

// NPM Packages
const Twit = require('twit');

const flatfile = require('flatfile');

const bcrypt = require('bcrypt');

// API Keys for Auth
const config = require('./config');
const T = new Twit(config);

// String array for queries
const queryArray = require('./queries');

// String array of banned queries
const blacklist = require('./blacklist');

// Generates random number for tweet intervals
function randomNum(min, max) {
    const num = Math.floor(Math.random() * (max - min) ) + min;
    console.log(`>>>>> Next retweet in: ${num/60/1000} minutes.`);
    return num;
};

// Randomly returns one of the two retweet per hour interval options 
function eitherOr(firstOption, secondOption) {
    const num = Math.floor(Math.random() * 100);
    if (num >= 50) {
        let timeOne = 1000*60*60 / secondOption;
        console.log(`>>>>> Next retweet in: ${timeOne / 1000 / 60} minutes.`);
        return timeOne;
    } else {
        let timeTwo = 1000*60*60/ firstOption;
        console.log(`>>>>> Next retweet in: ${timeTwo / 1000 / 60} minutes.`);
        return timeTwo;
    }
}

function printDots() {
    console.log(`.`);
    console.log(`.`);
    console.log(`.`);
    console.log(`.`);
    console.log(`.`);
}

// Timeout function
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom Async forEach loop
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index);
    }
}

// Compare string to blacklist string array
function checkBlacklist(str) {
    let listed = false;
    for (const i in blacklist) {
        if (str.includes(blacklist[i])) {
            console.log(`------- ${str} ------- contained blacklisted word: ${blacklist[i]}`);
            listed = true;
            break;
        } 
    }
    return listed;
}

// Compare tweet id to last id stored for handling same tweet errors
// Uses flatfile and bcrypt NPM packages
function checkLastTweet(text, query) {
    console.log(`Checking if tweet has been retweeted already...`);

    return new Promise((resolve, reject) => {
        // Load a flatfile database based on file: data.json
        flatfile.db('data.json', function(err, flatData) {
            if (!err) {
                // compare tweet with hashed tweet in flatfile
                bcrypt.compare(text, flatData[query], function(err, res) {
                    if(res) {
                        resolve(true);
                    } else {
                        console.log(`Tweet is unique!`);
                        // hash new tweet
                        bcrypt.hash(text, 10, function(err, hash) {
                            if (!err) {
                                // update hash then save flatfile
                                flatData[query] = hash;
                                flatData.save((err) => {
                                    console.log(err); 
                                });
                            }  else {
                                console.log(`Hashing error: ${err}`);
                            }
                          });
                        resolve(false);
                    } 
                });
            } else {
                console.log(err);
            }
        });
      });
}


// Retweets tweet using id from inputed tweet object
function postTweets(tweet) {
    let id = {
        id: tweet.id_str
    };
    
    // Twit client post method

    T.post('statuses/retweet/:id', id)
        .catch(function(err) {
            console.log(`caught error ${err.stack}`);
            noTimeout = true;
        })
        .then(function(result) {
            if (result == null) {
                console.log(`No post data`);
            } else {
                console.log(`Tweet: ${JSON.stringify(result.data.text)}`);
                tweetCount++;
                console.log(`Retweets: ` + tweetCount);
            }
        });
}

// Request tweets then post using Twit client
function reTweet(queries) {
    // implementation for looping through array and posting asynchronously
    let noTimeout = false;
    const queriesLength = queries.length;
    console.log(queriesLength);
    const start = async () => {
        await asyncForEach(queries, async (query, index) => {
            console.log(query);
            let params = {
                q: query,
                lang: `en`,
                count: 1
            };

            // timeout to avoid spamming requests
            await timeout(1000);

            // Twit client tweet request
            await T.get('search/tweets', params)
                .catch(function (err) {
                    console.log(`caught error ${err.stack}`);
                    noTimeout = true;
                })
                .then (async function(result) {
                    // Check to see if request limit has been reached, or no query match
                    if (result.data.statuses[0] === undefined) {
                        console.log(`No tweet ID: No match for query, or hit request limit`);
                        noTimeout = true;
                    } else {
                        const tweetData = result.data.statuses[0];
                        const tweetId = result.data.statuses[0].id;

                        // Tweet filters
                        const retweeted = await checkLastTweet(tweetData.text, query);
                        const isBlacklisted = await checkBlacklist(tweetData.text);

                        // Only run once data has run through filters
                        Promise.all([retweeted, isBlacklisted]).then(async () => {
                            // Filter conditionals
                            if (retweeted) {
                                console.log(`This has been retweeted already`);
                                noTimeout = true;
                            } else if (isBlacklisted) {
                                console.log(`This tweet contains blacklisted content`);
                                noTimeout = true;
                            } else {
                                noTimeout = false;
                                postTweets(tweetData);
                            }
                        })
                    }
                })
            // Quickfix for ensuring all promises are fullfilled
            await timeout(1000);
            
            // Intervals between tweets
            const queryIntervals = async () => {
                // If error, avoid timeout    
                if (noTimeout == false) {
                    console.log(`No timeout? ${noTimeout}`);
                    printDots();
                    // timeout promise
                    // Set to 15 or 20 minutes, calculation is 60mins / inputed value
                    await timeout(eitherOr(3, 4));
                } else {
                    console.log(`No timeout? ${noTimeout}`);
                    printDots();
                    noTimeout == false;
                }
            }
            await queryIntervals();

            if (index == queriesLength - 1) {
                return await reTweet(queryArray);
            }
        });
    }
    start();
}

function runRetweetBot(queryArr) {
    console.log(`Starting up script...`);
    reTweet(queryArr);
}


// SCRIPT START
// Input must be an array of strings
let tweetCount = 0;
runRetweetBot(queryArray);

