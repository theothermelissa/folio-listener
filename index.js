require("dotenv").config();
const { Messaging } = require("@signalwire/realtime-api");
const express = require("express");
const fetch = require("node-fetch");
const { urlencoded } = require("body-parser");
const cloudinary = require("cloudinary").v2;
const uploadImage = require("./utils/cloudinary.js");
const fs = require("fs").promises;
const axios = require("axios");


// >>>>> initialize signalwire client & set cloudinary config <<<<<

const { PROJECT_ID, API_TOKEN, API_POST_ENDPOINT } = process.env;
const app = express();
const port = 3001;
app.use(urlencoded({ extended: true }));

const swClient = new Messaging.Client({
  project: PROJECT_ID,
  token: API_TOKEN,
  contexts: ["text-to-post"],
});

cloudinary.config({
  secure: true,
});


// >>>>> parsing incoming messages <<<<<

const titleRegex = /\.\.(.*?)\.\./;
const textFileRegex = /\.txt$/;
const imageFileRegex = /\.(png|jpg|jpeg|gif)$/;


// this allows the user to include a title with their
// post by surrounding it with two periods on each side:
function parsePostFromMessageText(message) {
  if (!message) {
    return { title: "", content: "" };
  }
  const [_, title = ""] = titleRegex.exec(message) || [];
  const content = title.length
    ? message.replace(`..${title}..`, "").trim()
    : message;
  return {
    title,
    content,
  };
}

async function uploadImages(imagePaths) {
  const imageUrls = await Promise.all(
    imagePaths.map((imagePath) => uploadImage(imagePath))
  );
  return imageUrls;
}

// when signalwire sends an mms, the message text
// is included with the media, not in the body
// so we need to parse the text from the media:
async function parsePostFromMedia(mediaList) {
  const [_, ...mediaUrls] = mediaList;

  const textPath = mediaUrls.find((url) => textFileRegex.exec(url));
  const imagePaths = mediaUrls.filter((url) => imageFileRegex.exec(url));
  const images = uploadImages(imagePaths);
  const textReponse = await axios.get(textPath);
  const text = textReponse.data ? textReponse.data : "";
  
  let parsed = parsePostFromMessageText(text);
  parsed.media = (await images).map((i) => i.secure_url);

  return parsed;
}


// >>>>> signalwire event listeners <<<<<

swClient.on("message.received", async (incomingMessage) => {
  const { body, from, media } = incomingMessage;

  const post = (media && media.length)
    ? await parsePostFromMedia(media)
    : parsePostFromMessageText(body);

  const outgoingMessage = {
    author: from,
    date: new Date(),
    ...post,
  };

  console.log("outgoingMessage:", outgoingMessage);

  fetch(API_POST_ENDPOINT, {
    method: "post",
    body: JSON.stringify(outgoingMessage),
  })
    .then((response) => response.text())
    .then((responseData) => {
      console.log("Successfully posted:", responseData);
    })
    .catch((error) => {
      console.error("Unfortunate error:", error);
    });
});


// swClient.on("message.updated", async (updatedMessage) => {
//   console.log("updatedMessage:", updatedMessage);
// });

const outgoingMessage = {
  author: "Bobby",
  body: "Somebody looked at the page",
  date: new Date(),
};


// when the server receives a get request, it will send a post request to the API

app.get("/", (req, res) => {
  console.log("get request received");

  fetch(API_POST_ENDPOINT, {
    method: "post",
    body: JSON.stringify(outgoingMessage),
  })
    .then((response) => response.text())
    .then((responseData) => {
      console.log("Successfully posted:", responseData);
    })
    .catch((error) => {
      console.error("Unfortunate error:", error);
    });
  res.send("get request received");
});

// >>>>> start the server <<<<<

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});