const cloudinary = require("cloudinary").v2;
const { CLOUDINARY_API_SECRET, CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME } = process.env;

cloudinary.config({ 
    api_key: CLOUDINARY_API_KEY, 
    api_secret: CLOUDINARY_API_SECRET,
    cloud_name: CLOUDINARY_CLOUD_NAME,
  });
  

 function uploadImage(imgPath) {
    if (!imgPath) {return ""};
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      imgPath,
      {},
      (err, res) => {
        if (err) reject(err);
        resolve(res);
      }
    );
  });
}

module.exports = uploadImage;
  