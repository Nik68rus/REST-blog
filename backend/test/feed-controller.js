const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');

const User = require('../models/user');
const FeedController = require('../controllers/feed');

describe('Feed Controller = User status', () => {
  before((done) => {
    require('dotenv').config();
    mongoose
      .connect(process.env.MONGO_URI_TEST)
      .then((res) => {
        const user = new User({
          email: 'test@test.com',
          password: 'tester',
          name: 'Test',
          posts: [],
          _id: '637a0d118f67a474ea675514',
        });
        return user.save();
      })
      .then(() => {
        done();
      });
  });

  after((done) => {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });

  it('should send a response with valid user status for existing user', (done) => {
    const req = { userId: '637a0d118f67a474ea675514' };
    const res = {
      statusCode: 500,
      userStatus: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.userStatus = data.status;
      },
    };
    FeedController.getStatus(req, res, () => {}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      expect(res.userStatus).to.be.equal('I am new!');
      done();
    });
  });

  it('should add post to users posts', (done) => {
    const req = {
      body: {
        title: 'Test post',
        content: 'Test post content',
      },
      file: {
        path: 'abc',
      },
      userId: '637a0d118f67a474ea675514',
    };

    const res = {
      status: function () {
        return this;
      },
      json: () => {},
    };

    FeedController.createPost(req, res, () => {}).then((user) => {
      expect(user).to.have.property('posts');
      expect(user.posts).to.have.length(1);
      done();
    });
  });
});
