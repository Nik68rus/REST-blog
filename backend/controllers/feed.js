const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  try {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .populate('creator');
    res
      .status(200)
      .json({ message: 'Posts fetched succesfully', posts, totalItems });
  } catch (error) {
    const err = new Error('Cant load the posts!');
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error('No image provided!');
    error.statusCode = 422;
    throw error;
  }

  // Create post in db
  try {
    const { title, content } = req.body;
    const imageUrl = req.file.path;
    const post = await Post.create({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    const user = await User.findById(req.userId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }
    res.status(201).json({
      message: 'Post created successfully!',
      post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate('creator');
    if (!post) {
      const error = new Error('Cant find the post');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: 'Post found succesfully', post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    throw error;
  }

  try {
    const { postId } = req.params;
    const { title, content } = req.body;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path;
    }
    if (!imageUrl) {
      const error = new Error('No image picked!');
      error.statusCode = 422;
      throw error;
    }

    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Cant find the post');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();
    res.status(200).json({ message: 'Post updated!', post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Cant find the post');
      error.statusCode = 404;
      throw error;
    }
    //Check logged in user
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }

    const user = await User.findById(req.userId);
    console.log(user);
    user.posts.pull(postId);
    await user.save();

    clearImage(post.imageUrl);
    const result = await Post.findByIdAndRemove(postId);
    res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({ message: 'Status fetched', status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    throw error;
  }

  try {
    const { status } = req.body;
    console.log(status);
    const user = await User.findById(req.userId);
    user.status = status;
    await user.save();
    res.status(200).json({ message: 'Status updated' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (imagePath) => {
  const filePath = path.join(__dirname, '..', imagePath);
  fs.unlink(filePath, (err) => console.log(err));
};
