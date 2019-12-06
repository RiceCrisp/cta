const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')
const cron = require('node-cron')
const Twitter = require('twitter')

dotenv.config()

const twitter = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
})

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

const app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.get('/tweets/', async (req, res) => {
  const tweets = await getTweets()
  res.json(tweets)
})
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'))
})
app.listen(process.env.PORT)

checkTweets()

cron.schedule('0 0,12 * * *', () => {
  checkTweets()
})

async function getTweets() {
  const res = await pool.query('SELECT * FROM tweets;')
  return res.rows
}

function getLastTweet(client) {
  return new Promise(resolve => {
    client.query(`SELECT value FROM latest WHERE key = 'last_post';`, (err, res) => {
      if (err) throw err
      resolve(res.rows[0] ? res.rows[0].value : false)
    })
  })
}

async function checkTweets() {
  const client = await pool.connect()
  console.log('connected')
  let lastTweet = await getLastTweet(client)
  console.log('last tweet:', lastTweet)
  const args = { screen_name: 'cta', exclude_replies: true, count: 200 }
  if (lastTweet) {
    args.since_id = lastTweet
  }
  twitter.get('statuses/user_timeline', args, (error, tweets, response) => {
    const promises = []
    tweets.forEach(tweet => {
      const lineRegex = /(red|orange|yellow|green|blue|purple|pink|brown) line/ig
      const minorDelayRegex = /\[[^\]]*minor delays[^\]]*\]/ig
      const majorDelayRegex = /\[[^\]]*major delays[^\]]*\]/ig
      const significantDelayRegex = /\[[^\]]*significant delays[^\]]*\]/ig
      const plannedWorkRegex = /\[[^\]]*planned work[^\]]*\]/ig
      const serviceDisruptionRegex = /\[[^\]]*service disruption[^\]]*\]/ig
      const result = lineRegex.exec(tweet.text)
      const line = result ? result[1].toLowerCase() : false
      const warnings = []
      if (line) {
        if (minorDelayRegex.test(tweet.text)) {
          warnings.push('minor_delays')
        }
        if (majorDelayRegex.test(tweet.text)) {
          warnings.push('major_delays')
        }
        if (significantDelayRegex.test(tweet.text)) {
          warnings.push('significant_delays')
        }
        if (plannedWorkRegex.test(tweet.text)) {
          warnings.push('planned_work')
        }
        if (serviceDisruptionRegex.test(tweet.text)) {
          warnings.push('service_disruption')
        }
        if (warnings.length) {
          promises.push(updateTable(client, tweet, line, warnings))
        }
      }
    })

    // Save the id of the last tweet pulled
    promises.push(client.query(`UPDATE latest SET value = ${tweets.length ? tweets[0].id : lastTweet} WHERE key = 'last_post'`))

    // Remove rows over a year old
    const today = new Date()
    promises.push(client.query(`DELETE FROM tweets WHERE date < '${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}'`))

    // All SQL updates complete
    Promise.all(promises)
      .then(res => {
        console.log('done')
        client.release()
      })
      .catch(err => {
        console.log(`Error in executing ${err}`)
      })
  })
}

function updateTable(client, tweet, line, warnings) {
  return new Promise(resolve => {
    client.query(`INSERT INTO tweets (id, date, line, minor_delays, major_delays, significant_delays, planned_work, service_disruption)
    VALUES (${tweet.id}, '${tweet.created_at}', '${line}', ${warnings.includes('minor_delays')}, ${warnings.includes('major_delays')}, ${warnings.includes('significant_delays')}, ${warnings.includes('planned_work')}, ${warnings.includes('service_disruption')})
    ON CONFLICT (id) DO NOTHING;`, (err, res) => {
      if (err) throw err
      resolve()
    })
  }).catch(err => err)
}
