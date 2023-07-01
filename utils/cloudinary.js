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
    console.log('imgPath', imgPath)
    cloudinary.uploader.upload(
      imgPath,
      { responsive_breakpoints: { 
        create_derived: true, bytes_step: 20000, min_width: 200, max_width: 1000, 
        transformation: { crop: 'fill', aspect_ratio: '16:9', gravity: 'auto' } } },
      (err, res) => {
        if (err) reject(err);
        resolve(res);
      }
    );
  });
}

module.exports = uploadImage;
  