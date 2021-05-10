require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

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
  apiKey: "QW26G9WHDSW4XMUB",
  username: "",
  isLoggedIn: false,
  errorOccured: false,
  errorMessage: "",
  name: "",
  balance: 0,
  transactions: [],
  portfolioValue: 0
};

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

  try {
    data.errorOccured = false;
    var username = req.body.username, password = req.body.password;

    console.log(req.body);

    var client = await Client.findOne({'username': username, 'password': password}).exec();

    if (client == null) throw "Invalid user! Please try again";

    data.isLoggedIn = true;
    data.username = client.username;
    data.name = client.firstname + " " + client.lastname;
    data.balance = client.balance;

  } catch(err) {
    data.errorOccured = true;
    data.errorMessage = err;
  }

  res.render('index', data);
});

app.post('/addbalance', function(req, res) {
  data.errorOccured = false;
  data.balance += parseFloat(req.body.newbalance);

  Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
    if (err) {
      console.log("error has occured");
    }

    console.log("new balance updated to client account");
  });

  res.redirect('/');
});

app.get('/profile', function(req, res) {
  data.errorOccured = false;
  res.render('profile', data);
});

app.post('/buystock', async function(req, res) {
  try {
    data.errorOccured = false;

    var stockTransaction = {
      symbol: req.body.symbol,
      shares: parseInt(req.body.shares),
      price: parseFloat(req.body.price)
    };

    var quote = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stockTransaction.symbol+'&apikey='+data.apiKey)
                        .then(response => response.json())
                        .then(json => json["Global Quote"]);

    if (Object.keys(quote).length == 0) throw "Can't find symbol!";

    var totalPrice = stockTransaction.shares * stockTransaction.price;

    if (data.balance - totalPrice < 0) throw "Insufficient funds! Please try again.";

    data.transactions.push(stockTransaction);
    data.portfolioValue += totalPrice;
    data.balance -= totalPrice;

    Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
      if (err) {
        console.log("an error has occured!");
      }

      console.log("buy transaction successful!");
    });
  } catch (err) {
    data.errorOccured = true;
    data.errorMessage = err;
  }

  res.redirect('/');
});

app.post('/sellstock', async function(req, res) {
  try {
    var stockTransaction = {
      symbol: req.body.symbol,
      shares: parseInt(req.body.shares),
      price: parseFloat(req.body.price)
    };

    var quote = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stockTransaction.symbol+'&apikey='+data.apiKey)
                        .then(response => response.json())
                        .then(json => json["Global Quote"]);

    if (Object.keys(quote).length == 0) throw "Can't find symbol!";

    var transaction = data.transactions.find(() => {
      return stockTransaction.symbol;
    });

    if (transaction == null) throw "Can't find symbol!";

    var sharesDifference = transaction.shares - stockTransaction.shares;
    var priceDifference = transaction.price - stockTransaction.price;
    var balanceDifference = data.balance - (stockTransaction.shares * stockTransaction.price);

    if (sharesDifference < 0) throw "Insufficient shares!"

    if (priceDifference < 0) throw "Insufficient price!";

    if (balanceDifference < 0) throw "Insufficient funds!";

    transaction.shares -= stockTransaction.shares;
    transaction.price -= stockTransaction.price;
    data.balance -= stockTransaction.shares * stockTransaction.price;

    if (transaction.shares == 0) {
      data.transactions = data.transactions.filter((transaction, index) => {
        return data.transactions[index] != transaction;
      });
    }

    Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
      if (err) {
        console.log("an error has occured!");
      }

      console.log("buy transaction successful!");
    });
  } catch(err) {
    data.errorOccured = true;
    data.errorMessage = err;
  }

  res.redirect('/');
});

app.post('/logout', function(req, res) {
  console.log("Logging out of client account");
  data = {
    username: "",
    isLoggedIn: false,
    errorOccured: false,
    errorMessage: "",
    name: "",
    balance: 0,
    transactions: [],
    portfolioValue: 0
  };
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
