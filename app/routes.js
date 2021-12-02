const { ObjectId } = require("bson");
const { result, find } = require("lodash");

module.exports = function(app, passport, db, multer) {



 // Image Upload Code =========================================================================
 const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + ".png")
  }
});
const upload = multer({storage: storage}); 

// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        db.collection('messages').find().toArray((err, result) => {
          if (err) return console.log(err)
          res.render('profile.ejs', {
            user : req.user,
            messages: result
          })
        })
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    //Learn 
    app.get('/learn', function(req, res) {
      res.render('learn.ejs');
    })

    // FORUM 
    app.get('/forum',  async function(req, res) {
      let user = req.user
     await db.collection('users').find().toArray((err, result) => {
        if (err) return console.log(err)
        res.render('forum.ejs', {
         result: result,
         user: user
        });
      })
    })
    //Sub Cats in URL
    app.get('/forex/:sub', isLoggedIn, async function(req, res) {
      let page = req.params.sub
      var title
      await db.collection('topics').find().toArray((err, result) => {
        if (err) return console.log(err)
        var posts = result.filter(post => post.cat === page)
        
        if(page === 'pain'){
          title = "The Pain and Gains"
        }else if(page === 'strategy'){
          title = "STRATEGY"
        }else if(page === 'general'){
          title = 'GENERAL'
        }else if(page === 'predictions'){
          title = 'PREDICTIONS'
        }
        res.render('forumcat.ejs', {
          cat: page,
          title: title,
          posts: posts,
        })
      })
    })

    //display the topic 
    app.get('/forumtop/:postId', isLoggedIn, function(req,res) {
      let postId = ObjectId(req.params.postId)
      db.collection('topics').find({_id: postId}).toArray((err, result) => {
        db.collection('comment').find({post: postId}).toArray((err, mainResult) => {
          if (err) return console.log(err)
          console.log(mainResult)
          res.render('forumtop.ejs', {
            user: req.user,
            result: result[0],
            mainResult: mainResult
          })
        })
      })
    });

    //Post with category
    app.get('/forumpost/:cat', isLoggedIn, function (req, res) {
      let cat = req.params.cat
      res.render('forumpost.ejs', {
        cat: cat
      })
    })
// Discussion Forum Routes ===============================================================
//Post a topic in cat
    app.post('/topic/:cat', upload.single('file-to-upload'), (req, res) => {
      let user = req.user
      let cat = req.params.cat
      let time = (new Date()).toLocaleString();
      db.collection('topics').insertOne({
        topic: req.body.topic, 
        comment: req.body.comment, 
        likes: 0, 
        liked: false, 
        time, 
        cat, 
        tag: req.body.tag, 
        img: '/images/uploads/' + req.file.filename,
        postedBy: user.local.email}, 
        (err, result) => {
          if (err) return console.log(err)
        console.log('saved to database')
        res.render('forum.ejs')
      })
    })

    app.post('/comment/:postId', (req,res) => {
      let user = req.user;
      let time = (new Date()).toLocaleString();
      let postId = req.params.postId
      console.log('hi im a',req.body)
      db.collection('comments').insertOne({
        commentBy: user.local.email,
        comment: req.body.comment,
        likes: 0,
        liked: false,
        time,
        post: postId
      }, (err, result) => {
        if (err) return console.log(err)
        res.redirect('back')
      })
    })

    app.put('/topicLikes', (req, res) => {
      db.collection('topics')
      .findOneAndUpdate({_id: ObjectId(req.body._id)}, {
        $inc: {
          likes: 1,
        },
        $set: {
          liked: true,
        }
      }, {
        sort: {_id: -1},
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
        console.log(result); //Delete later
      })
    })


    app.delete('/topicDelete', (req, res) => {
      db.collection('topics').findOneAndDelete({_id: ObjectId(req.body.id)}, (err, result) => {
        if (err) return res.send(500, err)
        res.send(result)
      })
    })

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/forum', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/forum', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('forum.ejs');
}
