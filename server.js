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

app.get('/', async function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post('/', async function(req, res) {
  var username = req.body.username, password = req.body.password;

  console.log(req.body);

  var client = await Client.find({'username': username, 'password': password}).exec();

  if (client != null) {

  }
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
