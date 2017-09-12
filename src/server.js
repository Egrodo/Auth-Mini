const bodyParser = require('body-parser');
const express = require('express');

const Post = require('./post.js');

const STATUS_USER_ERROR = 422;

const server = express();
// to enable parsing of json bodies for post requests
server.use(bodyParser.json());

const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (typeof err === 'string') {
    res.json({ error: err });
  } else {
    res.json(err);
  }
};

const queryAndThen = (query, res, cb) => {
  query.exec((err, result) => {
    if (err) {
      sendUserError(err, res);
    } else {
      cb(result);
    }
  });
};

server.get('/', (req, res) => {
  res.json({ success: 'working' });
});
// TODO: This tries to find the post. Consolidate this into middleware.

const findPost = (req, res, next) => {
  const { id } = req.params.soID;

  if (!id) {
    res.status(STATUS_USER_ERROR);
    res.json({ error: 'You need to include an ID.' });
    return;
  }

  req.id = id;
  queryAndThen(Post.findOne({ soID: id }), res, (post) => {
    if (!post) {
      sendUserError("Couldn't find post with given ID", res);
      return false;
    }
  });
    
  next();
};

server.get('/accepted-answer/:soID', findPost, (req, res) => {
  queryAndThen(Post.findOne({ soID: id }), res, (post) => {
    const query = Post.findOne({ soID: post.acceptedAnswerID });
    queryAndThen(query, res, (answer) => {
      if (!answer) {
        sendUserError('No accepted answer', res);
      } else {
        res.json(answer);
      }
    });
  });
});

server.get('/top-answer/:soID', findPost, (req, res) => {
  queryAndThen(Post.findOne({ soID: req.params.soID }), res, (post) => {
    if (!post) {
      sendUserError("Couldn't find post with given ID", res);
      return;
    }

    const query = Post
      .findOne({
        soID: { $ne: post.acceptedAnswerID },
        parentID: post.soID,
      })
      .sort({ score: 'desc' });

    queryAndThen(query, res, (answer) => {
      if (!answer) {
        sendUserError('No top answer', res);
      } else {
        res.json(answer);
      }
    });
  });
});

server.get('/r-jquery-questions', (req, res) => {
  const query = Post.find({
    parentID: null,
    tags: 'jquery',
    $or: [
      { score: { $gt: 5000 } },
      { 'user.reputation': { $gt: 200000 } }
    ]
  });

  queryAndThen(query, res, posts => res.json(posts));
});

server.get('/npm-answers', (req, res) => {
  const query = Post.find({
    parentID: null,
    tags: 'npm'
  });

  queryAndThen(query, res, (posts) => {
    const answerQuery = Post.find({
      parentID: { $in: posts.map(p => p.soID) }
    });
    queryAndThen(answerQuery, res, answers => res.json(answers));
  });
});


module.exports = { server };
