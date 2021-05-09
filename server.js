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

//Stores all data that EJS files will need to keep it organized and allowing us to manipulate data that's necessary rather than all data
var data = {
  isLoggedIn: false,
  errorOccured: false,
  name: "",
  dir: "",
}

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

  res.render('index', data);
});

app.post('/', async function(req, res) {
  var username = req.body.username, password = req.body.password;

  console.log(req.body);

  var client = await Client.findOne({'username': username, 'password': password}).exec();

  if (client != null) {
    data.isLoggedIn = true;
    data.name = client.firstname + " " + client.lastname;
    data.dir = req.protocol + '://' + req.get('host');
    res.render('index', data);
  }

  else {
    data.errorOccured = true;
    res.render('index', data);
  }
});

app.post('/logout', function(req, res) {
  console.log("Logging out of client account");
  data = {
    isLoggedIn: false,
    errorOccured: false,
    name: "",
    dir: "",
    balance: 0
  };
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
