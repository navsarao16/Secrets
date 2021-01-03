require('dotenv').config(); // we need to do is just require it and then call config on it and we don't need it ever again
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
 // const bcrypt = require("bcrypt");
 // const saltRounds = 10;

const app = express();

console.log(process.env.API_KEY)
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// passport configuration
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true)  // to remove warning node 14172 deprecation warning collection.ensure index is deprecated. USe createIndexes instead.
const userSchema = new mongoose.Schema({    // for encryption
  email: String,
  password: String,
  googleId: String,
  secret: String
});
 userSchema.plugin(passportLocalMongoose); // add passportLocalMongoose plugin to userSchema
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt,{ secret: process.env.SECRET, encryptedFields:["password"] });   // add this before add the schema in the model

const User = new mongoose.model("User", userSchema);

 // Copy from the documentation of passportLocalMongoose configuration
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3002/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    // by doing userProfileURL we fix the problem google+deprecation
    },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/register", function(req, res){
  res.render("register");
})

app.get("/login", function(req, res){
  res.render("login");
})

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers})
      }
    }
  })
});

 app.get("/submit", function(req, res){
   if(req.isAuthenticated()){
     res.render("submit");
   }else{
     res.redirect("/login");
  }
});


app.post("/submit", function(req, res){
 const submittedSecret = req.body.secret;
  // now we want to do is to find the current user in our databbse and then savethe secrets
  // how we know what is the current user is >
 // passport very handly saves the users details because when we initiate a new login session it will save the suer detail into the req variable
//  console.log(req.user);
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        })
      }
    }
  })

});

app.get("/logout", function(req, res){
  req.logout();    // from session documentation
  res.redirect("/");
})

app.post("/register", function(req, res){
User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    })
  }
})




  //
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {    // we got hash after 10 saltRounds and also passing password
  //   const newUser = new User({
  //   email: req.body.username,
  //   password: hash
  //   });
  //     newUser.save(function(err){
  //       if(!err){
  //         res.render("secrets");
  //       }else{
  //         console.log(err);
  //       }
  //     });
  //   })
})

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  // login() comes from passport
req.login(user, function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    })
  }
})




 //  const username = req.body.username;
 //  const password = req.body.password;
 //
 // User.findOne({email: username}, function(err, foundUser){
 //   if(err){
 //     console.log(err);
 //   }else{
 //     if(foundUser){
 //       bcrypt.compare(password, foundUser.password, function(err, result) {
 //          if(result === true){
 //            res.render("secrets");
 //          }
 //    });
 //       }
 //     }
//   })
})



app.listen(3002, function(){
  console.log("Server running");
})
