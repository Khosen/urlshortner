require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Body parsing middleware

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, unique: true, required: true }
});

const Url = mongoose.model('Url', urlSchema);

// Static files
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// API endpoint to create a shortened URL
app.post('/api/shorturl', async function(req, res) {
  const { original_url } = req.body;

  // Validate the URL format
  let urlParts;
  try {
    urlParts = new URL(original_url); // Will throw if the URL is invalid
  } catch (error) {
    return res.status(400).json({ error: 'invalid url' });
  }

  // Check DNS to verify the hostname
  dns.lookup(urlParts.hostname, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'invalid url' });
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

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
