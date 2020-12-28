require('dotenv').config(); // we need to do is just require it and then call config on it and we don't need it ever again
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
 const bcrypt = require("bcrypt");
 const saltRounds = 10;

const app = express();

console.log(process.env.API_KEY)
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({    // for encryption
  email: String,
  password: String
});


//userSchema.plugin(encrypt,{ secret: process.env.SECRET, encryptedFields:["password"] });   // add this before add the schema in the model

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
})

app.get("/register", function(req, res){
  res.render("register");
})

app.get("/login", function(req, res){
  res.render("login");
})

app.post("/register", function(req, res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {    // we got hash after 10 saltRounds and also passing password
    const newUser = new User({
    email: req.body.username,
    password: hash
    });
      newUser.save(function(err){
        if(!err){
          res.render("secrets");
        }else{
          console.log(err);
        }
      });
    })
})

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = md5(req.body.password);

 User.findOne({email: username}, function(err, foundUser){
   if(err){
     console.log(err);
   }else{
     if(foundUser){
       if(foundUser.password === password){
         res.render("secrets");
       }
     }
   }
 })


})



app.listen(3002, function(){
  console.log("Server running");
})
