const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/user');
const Post = require('../models/post');

const { clearFile, clearImage } = require('../util/file');

module.exports = {
  createUser: async function (args, req) {
    const { email, name, password } = args.userInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: 'Email is invalid!' });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: 'Password to short!' });
    }

    if (errors.length) {
      const error = new Error('Invalid input!');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User alredy exists!');
      throw error;
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error('Wrong password!');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      token,
      userId: user._id.toString(),
    };
  },
  createPost: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { title, content, imageUrl } = args.postInput;
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid!' });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid!' });
    }

    if (errors.length) {
      const error = new Error('Invalid input!');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('Invalid user!');
      error.code = 401;
      throw error;
    }

    const post = await Post.create({
      title,
      imageUrl,
      content,
      creator: user,
    });

    user.posts.push(post);
    await user.save();

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      creator: user._doc,
    };
  },
  posts: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    let { page } = args;
    if (!page) {
      page = 1;
    }

    const perPage = 2;

    const posts = await Post.find()
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .populate('creator');
    const totalItems = await Post.find().countDocuments();

    return {
      posts: posts.map((post) => ({
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      totalItems,
    };
  },

  post: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }
    let { postId } = args;

    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Not found!');
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { id, postInput } = args;
    const { title, content, imageUrl } = postInput;

    const post = await Post.findById(id).populate('creator');

    if (!post) {
      const error = new Error('Post not found!');
      error.code = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized!');
      error.code = 403;
      throw error;
    }
    const errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: 'Title is invalid!' });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid!' });
    }

    if (errors.length) {
      const error = new Error('Invalid input!');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    post.title = title;
    post.content = content;
    if (imageUrl !== 'undefined') {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { id } = args;

    const post = await Post.findById(id);

    if (!post) {
      const error = new Error('Post not found!');
      error.code = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized!');
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);

    const user = await User.findById(post.creator);
    user.posts.pull(id);
    await user.save();

    const result = await Post.findByIdAndRemove(id);
    return result;
  },

  status: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('User not found!');
      error.code = 404;
      throw error;
    }

    return user.status;
  },

  updateStatus: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated!');
      error.code = 401;
      throw error;
    }

    const { status } = args;

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('User not found!');
      error.code = 404;
      throw error;
    }

    user.status = status;
    await user.save();
    return status;
  },
};
