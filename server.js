require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');

const app = express();

app.enable('trust proxy');
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({  extended: true }));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DBHOST + process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});

const clientSchema = mongoose.Schema({
  username: String,
  password: String,
  firstname: String,
  lastname: String,
  balance: Number
});

const Client = mongoose.model("client", clientSchema);

app.get('/', function(req, res) {
  console.log("should call ejs");

  res.render('index', {isLoggedIn: false, errorOccured: false});
});

app.post('/', async function(req, res) {
  var username = req.body.username, password = req.body.password;

  console.log(req.body);

  var client = await Client.findOne({'username': username, 'password': password}).exec();

  if (client != null) {
    res.render('index', {isLoggedIn: true, errorOccured: false});
  }

  else {
    res.render('index', {isLoggedIn: false, errorOccured: true});
  }
});

app.post('/logout', function(req, res) {
  res.render('index', {isLoggedIn: false, errorOccured: false});
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
