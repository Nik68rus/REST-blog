const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const multer = require('multer');

const bodyParser = require('body-parser');

const feedRoutes = require('./routes/feed');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded());  // x-www-form-urlencoded
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
app.use('/feed', feedRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode, message } = error;
  res.status(statusCode || 500).json({ message });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then((res) => {
    console.log(`Mongo DB connected: ${res.connection.host}`);
    app.listen(8080, () => console.log(`Server started on port 8080`));
  })
  .catch((err) => console.log(err));
