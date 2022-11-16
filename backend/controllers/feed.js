const { validationResult } = require('express-validator');
const Post = require('../models/post');

exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find();
    res.status(200).json({ posts });
  } catch (error) {
    const err = new Error('Cant load the posts!');
    err.statusCode = 500;
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

  // Create post in db
  try {
    const { title, content } = req.body;
    const post = await Post.create({
      title,
      content,
      imageUrl: 'images/coffee.jpg',
      creator: { name: 'Nik' },
    });
    console.log(post);
    res.status(201).json({
      message: 'Post created successfully!',
      post,
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
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
