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

const { PROJECT_ID, API_TOKEN, API_POST_ENDPOINT, SIGNALWIRE_CONTEXT } = process.env;
const app = express();
const port = 3001;
app.use(urlencoded({ extended: true }));

const swClient = new Messaging.Client({
  project: PROJECT_ID,
  token: API_TOKEN,
  contexts: [SIGNALWIRE_CONTEXT],
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
  const [...mediaUrls] = mediaList;

  const textPath = mediaUrls.find((url) => textFileRegex.exec(url));
  // console.log("textPath: ", textPath)
  const imagePaths = mediaUrls.filter((url) => imageFileRegex.exec(url));
  // console.log("imagePaths: ", imagePaths)
  const images = uploadImages(imagePaths);
  
  let text = ""

  if (textPath) {
    let response = await axios.get(textPath)
    // console.log("text response: ", response)
    if (response && response.data) {
      // console.log("text response.data: ", response.data)
      text = response.data
    }
  }
  
  let parsed = parsePostFromMessageText(text);
  parsed.media = (await images).map((i) => i.secure_url);

  return parsed;
}


// >>>>> signalwire event listeners <<<<<

swClient.on("message.received", async (incomingMessage) => {
  const { body, from, media, to, id } = incomingMessage;

  console.log(">>>>>>>>>>>> message received: ", incomingMessage)

  const post = (media && media.length)
    ? await parsePostFromMedia(media)
    : parsePostFromMessageText(body);

  const outgoingMessage = {
    author: from,
    textMesageId: id,
    to: to,
    date: new Date(),
    ...post,
  };

  // console.log("outgoingMessage:", outgoingMessage);

  fetch(API_POST_ENDPOINT, {
    method: "post",
    body: JSON.stringify(outgoingMessage),
  })
    .then((response) => response.text())
    .then(async (responseData) => {
      // console.log("responseData:", responseData);
      // const { feedUrl, isNewFeed } = JSON.parse(responseData);
      // if (isNewFeed) {
      //   console.log("new feed; sending message")
      //   const confirmationMessage = await swClient.send({
      //     to: from,
      //     from: to,
      //     body: `Welcome to Folio! Since this is your first post, we've made a website for you here: ${feedUrl}`,
      //   })
      //   console.log("confirmationMessage: ", confirmationMessage)
      // }
    })
        .catch((error) => {
      console.error("Unfortunate error:", error);
    });
});

swClient.on("message.updated", async (incomingMessage) => {
  const { body, from, media, to, id } = incomingMessage;
  console.log(">>>>>>>>>>>>> incomingMessage on update:", incomingMessage)

  const post = (media && media.length)
    ? await parsePostFromMedia(media)
    : parsePostFromMessageText(body);

  const outgoingMessage = {
    author: from,
    textMesageId: id,
    to: to,
    date: new Date(),
    ...post,
  };

  // console.log("outgoingMessage on update:", outgoingMessage);

  fetch(API_POST_ENDPOINT, {
    method: "PATCH",
    body: JSON.stringify(outgoingMessage),
  })
    .then((response) => response.text())
    .then(async (responseData) => {
      // console.log("responseData:", responseData);
      // const { feedUrl, isNewFeed } = JSON.parse(responseData);
      // if (isNewFeed) {
      //   console.log("new feed; sending message")
      //   const confirmationMessage = await swClient.send({
      //     to: from,
      //     from: to,
      //     body: `Welcome to Folio! Since this is your first post, we've made a website for you here: ${feedUrl}`,
      //   })
      //   console.log("confirmationMessage: ", confirmationMessage)
      // }
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

// app.get("/", (req, res) => {
//   console.log("get request received");

//   fetch(API_POST_ENDPOINT, {
//     method: "post",
//     body: JSON.stringify(outgoingMessage),
//   })
//     .then((response) => response.text())
//     .then((responseData) => {
//       console.log("Successfully posted:", responseData);
//     })
//     .catch((error) => {
//       console.error("Unfortunate error:", error);
//     });
//   res.send("get request received");
// });

// >>>>> start the server <<<<<

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});