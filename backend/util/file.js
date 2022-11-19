const fs = require('fs');
const path = require('path');

const clearImage = (imagePath) => {
  const filePath = path.join(__dirname, '..', imagePath);
  fs.unlink(filePath, (err) => console.log(err));
};

exports.clearImage = clearImage;
