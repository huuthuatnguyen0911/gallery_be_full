require("dotenv").config();
const express = require("express");
const cor = require("cors");
const multer = require("multer");
const app = express();
const DatauriParser = require("datauri/parser");
const path = require("path");
const cloudinary = require("cloudinary").v2;

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cor());

// Multer setting
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/jpg"];

// Use memoryStrorage for multer upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (ALLOWED_FORMATS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Không hỗ trợ định dạng file"), false);
    }
  },
});

const singleUpload = upload.single("file");
const singleUploadControl = (req, res, next) => {
  singleUpload(req, res, (error) => {
    if (error) {
      console.log(error);
      return res.status(422).send({
        message: "Đã có lỗi xảy ra",
      });
    }
    next();
  });
};

// use datauri to stream buffer
const parser = new DatauriParser();
const formatBuffer = (file) => {
  return parser.format(
    path.extname(file.originalname).toString().toLowerCase(),
    file.buffer
  );
};

// Setting cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
console.log(process.env.CLOUD_NAME, process.env.API_KEY, process.env.API_SECRET, process.env.UPLOAD_PRESET)
cloudinaryUpload = (file) => {
  return cloudinary.uploader.upload(file, {
    upload_preset: process.env.UPLOAD_PRESET,
  });
};
// get image from folder using cloudinary Search API
getImages = async (next_cursor) => {
  const resources = await cloudinary.search
    .expression("folder:mom_pictures")
    .max_results(20)
    .sort_by("uploaded_at", "desc")
    .next_cursor(next_cursor)
    .execute();
  return resources;
};
// getimage api
app.get("/api/photos", async (req, res, next) => {
  try {
    const response = await getImages(req.query.next_cursor || "");
    const results = {
        images: [],
        next_cursor: null,
    }
    response.resources.forEach(item => {
        results.images.push({
            public_id: item.public_id,
            created_at: item.created_at,
            secure_url: item.secure_url
        })
    })
    if(response.next_cursor){
        results.next_cursor = response.next_cursor;
    }
    res.status(200).json({
        results,
    })
    // console.log(response);
  } catch (error) {
    console.log(error)
  }
});
// api upload
app.post("/api/upload", singleUploadControl, async (req, res) => {
  const uploadFile = req.body.file || req.file;
  try {
    if (!uploadFile) {
      return res.status(422).send({
        message: "Có lỗi xãy ra khi upload",
      });
    }
    let uploadResult;
    if (!uploadFile.buffer) {
      uploadResult = await cloudinaryUpload(uploadFile);
    } else {
      const file64 = formatBuffer(req.file);
      uploadResult = await cloudinaryUpload(file64.content);
    }
    // Convert stream to base64 format
    // const file64 = formatBuffer(req.file)

    // const uploadResult = await cloudinaryUpload(file64.content)
    return res.status(200).json({
      cloudinaryId: uploadResult.public_id,
      url: uploadResult.secure_url,
      message: "Upload sucess",
    });
  } catch (error) {
    return res.status(422).send({
      message: error.message,
    });
  }
});

app.get("/api", (req, res) => {
  res.send("Hello");
});
const port = 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
