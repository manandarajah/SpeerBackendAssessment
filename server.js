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
  apiKey: process.env.AV_API_KEY,
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

  //Validates client login credentials
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

//Adds balance to wallet and updates the client's record in the database
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

//Display's client's profile and portfolio
app.get('/profile', function(req, res) {
  data.errorOccured = false;
  res.render('profile', data);
});

//Buys stock
app.post('/buystock', async function(req, res) {
  try {
    data.errorOccured = false;

    //Creates a transaction object used to verify and proceed with buy process
    var stockTransaction = {
      symbol: req.body.symbol,
      shares: parseInt(req.body.shares),
      price: parseFloat(req.body.price)
    };

    //Checks to see if symbol exists before making a purchase
    var quote = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stockTransaction.symbol+'&apikey='+data.apiKey)
                        .then(response => response.json())
                        .then(json => json["Global Quote"]);

    if (Object.keys(quote).length == 0) throw "Can't find symbol!";

    //Checks to see if the transaction order is affordable to the client
    var totalPrice = stockTransaction.shares * stockTransaction.price;

    if (data.balance - totalPrice < 0) throw "Insufficient funds! Please try again.";

    //Adds transaction into array and update's a client's balance in the database
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

//Sell stock
app.post('/sellstock', async function(req, res) {
  try {

    //Creates a transaction object used to verify and proceed with sell process
    var stockTransaction = {
      symbol: req.body.symbol,
      shares: parseInt(req.body.shares),
      price: parseFloat(req.body.price)
    };

    //Checks to see if symbol exists before making a sell
    var quote = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+stockTransaction.symbol+'&apikey='+data.apiKey)
                        .then(response => response.json())
                        .then(json => json["Global Quote"]);

    console.log(stockTransaction.symbol + " " + stockTransaction.symbol.length);

    if (Object.keys(quote).length == 0) throw "Can't find symbol!";
    else if (quote == null) throw "Something unexpected happened! Please try again later!";

    //Checks to see if the stock is purchased by the client
    var transaction = data.transactions.find(() => {
      return stockTransaction.symbol;
    });

    if (transaction == null) throw "Can't find symbol!";

    //Validates client's stock information before selling
    var sharesDifference = transaction.shares - stockTransaction.shares;
    var priceDifference = transaction.price - stockTransaction.price;
    var balanceDifference = data.balance - (stockTransaction.shares * stockTransaction.price);

    if (sharesDifference < 0) throw "Insufficient shares!"

    if (priceDifference < 0) throw "Insufficient price!";

    if (balanceDifference < 0) throw "Insufficient funds!";

    //Modifies all data and removes it if there are exactly 0 shares. It will also update the client's balance in the database
    transaction.shares -= stockTransaction.shares;
    transaction.price -= stockTransaction.price;
    data.balance -= stockTransaction.shares * stockTransaction.price;

    if (transaction.shares == 0) {
      data.transactions = data.transactions.filter((transaction, index) => {
        return data.transactions[index].shares !== 0;
      });
    }

    Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
      if (err) {
        console.log("an error has occured!");
      }

      console.log("sell transaction successful!");
    });
  } catch(err) {
    data.errorOccured = true;
    data.errorMessage = err;
  }

  res.redirect('/');
});

//Logs out of client's account
app.post('/logout', function(req, res) {
  console.log("Logging out of client account");

  //Resets the data attribute before logging out
  data = {
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
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
