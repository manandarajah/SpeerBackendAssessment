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
  username: "",
  isLoggedIn: false,
  errorOccured: false,
  errorMessage: "",
  name: "",
  dir: "",
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
  data.errorOccured = false;
  var username = req.body.username, password = req.body.password;

  console.log(req.body);

  var client = await Client.findOne({'username': username, 'password': password}).exec();

  if (client != null) {
    data.isLoggedIn = true;
    data.username = client.username;
    data.name = client.firstname + " " + client.lastname;
    data.dir = req.protocol + '://' + req.get('host');
    data.balance = client.balance;
  }

  else {
    data.errorOccured = true;
    data.errorMessage = "Invalid user! Please try again";
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

app.post('/buystock', function(req, res) {
  data.errorOccured = false;

  var stockTransaction = {
    symbol: req.body.symbol,
    shares: parseInt(req.body.shares),
    price: parseFloat(req.body.price)
  };

  var totalPrice = stockTransaction.shares * stockTransaction.price;

  if (data.balance - totalPrice >= 0) {
    data.transactions.push(stockTransaction);
    data.portfolioValue += totalPrice;
    data.balance -= totalPrice;

    Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
      if (err) {
        console.log("an error has occured!");
      }

      console.log("buy transaction successful!");
    });
  }

  else {
    data.errorOccured = true;
    data.errorMessage = "Insufficient funds! Please try again.";
  }
  res.redirect('/');
});

app.post('/sellstock', function(req, res) {
  var stockTransaction = {
    symbol: req.body.symbol,
    shares: parseInt(req.body.shares),
    price: parseFloat(req.body.price)
  };

  var transaction = data.transactions.find(() => {
    return stockTransaction.symbol;
  });

  if (transaction == null) {
    data.errorOccured = true;
    data.errorMessage = "Can't find symbol!";
  }

  else {
    var sharesDifference = transaction.shares - stockTransaction.shares;
    var priceDifference = transaction.price - stockTransaction.price;
    var balanceDifference = data.balance - (stockTransaction.shares * stockTransaction.price);

    if (sharesDifference >= 0 && priceDifference >= 0 && balanceDifference >= 0) {
      transaction.shares -= stockTransaction.shares;
      transaction.price -= stockTransaction.price;
      data.balance -= stockTransaction.shares * stockTransaction.price;

      Client.updateOne({'username': data.username}, {'balance': data.balance}, function(err) {
        if (err) {
          console.log("an error has occured!");
        }

        console.log("buy transaction successful!");
      });
    }

    else {
      if (sharesDifference < 0) {
        data.errorOccured = true;
        data.errorMessage = "Insufficient shares!";
      }

      else if (priceDifference < 0) {
        data.errorOccured = true;
        data.errorMessage = "Insufficient price!";
      }

      else if (balanceDifference < 0) {
        data.errorOccured = true;
        data.errorMessage = "Insufficient funds!";
      }
    }
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
    dir: "",
    balance: 0,
    transactions: [],
    portfolioValue: 0
  };
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server is runing on port 3000");
});
