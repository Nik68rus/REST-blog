const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');
const { clearFile } = require('./util/file');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const bodyParser = require('body-parser');
const auth = require('./middleware/auth');

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
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);
app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not Authentificated');
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File stored', filePath: req.file.path });
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const { data } = err.originalError;
      const message = err.message || 'An error occured!';
      const code = err.originalError.code || 500;
      return { message, data, status: code };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode, message, data } = error;
  res.status(statusCode || 500).json({ message, data });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then((res) => {
    console.log(`Mongo DB connected: ${res.connection.host}`);
    app.listen(8080, () => console.log(`Server started on port 8080`));
  })
  .catch((err) => console.log(err));
