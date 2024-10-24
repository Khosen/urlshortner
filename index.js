require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Base62 = require('base62');
const app = express();
const dns = require('dns');


// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){ console.log('connected to mongoDB');});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const urlSchema= new mongoose.Schema({
  original_url:{type:String, required: true},
  short_url:{type:String, required: true}
});

const Url = mongoose.model('Url', urlSchema);

let counter = 0;

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


app.post('/api/shorturl', async(req, res)=>{
  const{ original_url } = req.body;
  try {
    const urlParts = new URL(original_url); // Will throw an error if the URL is invalid

    // Check DNS to verify the hostname
    dns.lookup(urlParts.hostname, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      try {
        // Check if the URL already exists in the database
        const existingUrl = await Url.findOne({ original_url });
        if (existingUrl) {
          return res.json({ original_url, short_url: existingUrl.short_url });
        }

        // Generate a new short URL
        const urlCount = await Url.countDocuments();
        const newUrl = new Url({
          original_url,
          short_url: urlCount + 1
        });

        await newUrl.save();
        return res.json({ original_url, short_url: newUrl.short_url });
      } catch (err) {
        return res.status(500).send(err);
      }
    });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
});

// API endpoint to redirect to the original URL
app.get('/api/shorturl/:shorturl', async function(req, res) {
  const shortUrl = req.params.shorturl;

  try {
    const urlEntry = await Url.findOne({ short_url: shortUrl });
    if (urlEntry) {
      return res.redirect(urlEntry.original_url);
    }
    return res.status(404).json({ error: 'Short URL not found' });
  } catch (err) {
    return res.status(500).send(err);
  }
});
//let foundUrl = await
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
