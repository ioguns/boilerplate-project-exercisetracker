const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))

main().catch(err => console.log(err));

// mongoose mongodb connection
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
}

//schemas
let exerciseSchema = new mongoose.Schema({
  user_id: String,
  description: String,
  duration: Number,
  date: Date,
})

let userSchema = new mongoose.Schema({
  username: String
})

//Models
let Exercise = mongoose.model('Exercise', exerciseSchema);
let User = mongoose.model('User', userSchema);

//routes and handlers

app.get('/api/users/:id/logs', (req, res) => {

  let from = req.query.from || -1;
  let to = req.query.to || -1;
  let limit = req.query.limit || -1;

  //sanitize
  
  if (limit != -1) {
    limit = Number.parseInt(limit);
    if (isNaN(limit)) {
      res.json({ error: 'Unable to find user logs.' });
      return;
    }
  }

  if (from != -1) {
    from = Date.parse(from);
    if (isNaN(from)) {
      res.json({ error: 'Unable to find user logs.' });
      return;
    }
    from = new Date(from);
  }

  if (to != -1) {

    to = Date.parse(to);
    if (isNaN(to)) {
      res.json({ error: 'Unable to find user logs.' });
      return;
    }

    to = new Date(to);
  }

  User.findById(req.params.id, (err, user) => {

    if (err) {
      res.json({ error: 'Unable to find user logs.' });
      return;
    }

    if (user) {

      let query = Exercise.where('user_id', user._id);

      //if from is set
      if (from != -1) {
        query = query.where('date').gte(from)
      }

      //if to is set
      if (to != -1) {
        query = query.where('date').lte(to)
      }

      //if limit is set
      if (limit != -1 && limit > 0) {
        query = query.limit(limit)
      }

      query.exec((err, exercises) => {

        if (err) {
          res.json({ error: 'unable to find user logs.' });
          return;
        }

        if (exercises.length) {

          let logs = [];
          let i = 0;
          for (i = 0; i < exercises.length; i++) {
            logs.push({
              description: exercises[i].description,
              duration: exercises[i].duration,
              date: (new Date(Date.parse(exercises[i].date))).toDateString()
            });
          }

          res.json({ _id: user._id, username: user.username, count: exercises.length, log: logs });
        } else {
          res.json({ _id: user._id, username: user.username, count: 0, log: [] });
        }
      });
    } else {
      res.json({ error: 'unable to find user logs.' });
    }
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  User.findOne({ _id: req.params._id }, function(err, user) {
    if (err) {
      res.json({ error: 'unable to find user.' });
      return;
    }

    if (user) {
      // new exercise model
      let exercise = new Exercise({
        user_id: user._id,
        description: req.body.description,
        duration: req.body.duration
      });

      if (req.body.date == undefined) {
        exercise.date = new Date();
      } else {
        let date = Date.parse(req.body.date);
        if (isNaN(date)) {
          res.json({ error: 'Unable to save user exercise.' });
          return;
        }
        exercise.date = new Date(date);
      }

      //save the model
      exercise.save(function(err, rExercise) {
        //if error
        if (err) {
          res.json({ error: 'unable to save data.' });
          return;
        }

        //return data to the request client
        res.json({
          _id: rExercise.user_id,
          username: user.username,
          description: rExercise.description,
          duration: rExercise.duration,
          date: (new Date(Date.parse(rExercise.date))).toDateString()
        });
      });
    } else {
      res.json({ error: 'unable to find user - ' + req.params._id });
    }
  });
});

app.route('/api/users')
  //get users
  .get(function(req, res) {
    User.find({}, (err, data) => {
      res.json(data);
    })
  })
  //add users
  .post((req, res) => {
    // new user model
    let user = new User({
      username: req.body.username,
    });

    //save the model
    user.save(function(err, data) {
      //if error
      if (err) {
        res.json({ error: 'unable to save data.' });
        return;
      }
      //return data to the request client
      res.json(data);
    });
  });


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
