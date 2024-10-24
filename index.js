require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Base62 = require('base62');
const app = express();

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

  console.log(req.body);
  let foundUrl = await Url.findOne({original_url: original_url});
  if(foundUrl){
    return res.json({original_url: foundUrl.original_url, short_url: foundUrl.short_url});
  }
  counter +=1;
  const shortId= Base62.encode(counter);

  const newUrl = new Url({original_url:original_url, short_url: shortId});
  await newUrl.save();

  res.json({original_url:original_url, short_url: shortId});


  app.get('/api/shorturl/:shortid', async(req, res)=>{ const shortid = req.params.shortid;
    const foundUrl=await Url.findOne({short_url: shortId});
    if(foundUrl){
      res.redirect(foundUrl.original_url);
    }else {
      res.json({error: 'No short URl found for the given input'});
    }
  });

});

//let foundUrl = await
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
