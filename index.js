require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define a schema and model for the URL
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

// POST endpoint to shorten URL
app.post('/api/shorturl', (req, res) => {
  const { original_url } = req.body;

  // Use dns.lookup to validate the URL
  const urlParts = new URL(original_url);
  dns.lookup(urlParts.hostname, (err) => {
    if (err) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Create a new URL record
    Url.countDocuments({}, (err, count) => {
      if (err) return res.status(500).json({ error: 'Internal Server Error' });

      const newUrl = new Url({
        original_url,
        short_url: count + 1
      });

      newUrl.save((err, savedUrl) => {
        if (err) return res.status(500).json({ error: 'Internal Server Error' });
        res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
      });
    });
  });
});

// Redirect to original URL
app.get('/api/shorturl/:shorturl', (req, res) => {
  const { shorturl } = req.params;

  Url.findOne({ short_url: shorturl }, (err, doc) => {
    if (err || !doc) {
      return res.status(404).json({ error: 'URL not found' });
    }
    res.redirect(doc.original_url);
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
