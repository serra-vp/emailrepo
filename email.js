const nodemailer = require("nodemailer");
const { google } = require("googleapis");
require("dotenv").config();

const fs = require("fs");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_OAUTH_CLIENT_ID,
  process.env.GMAIL_OAUTH_CLIENT_SECRET,
  process.env.GMAIL_OAUTH_REDIRECT_URL
);

const generateAuthURL = () => {
  const GMAIL_SCOPES = process.env.SCOPES.split(",");

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES
  });

  return url;
};

const getToken = async code => {
  const { tokens } = await oauth2Client.getToken(code);
  return createTokenCredentials(tokens);
};

const isJSONEmpty = obj => {
  return !Object.keys(obj).length;
};

const readFile = (token) => {
  let rawdata = fs.readFileSync("token.json");
  if (isJSONEmpty(rawdata)) {
    //write in json
    let JSONtoken = JSON.stringify(tokens, null, 2);
    fs.writeFileSync("token.json", JSONtoken);
    return JSON.parse(JSONtoken);
  }
  let JSONtoken = JSON.parse(rawdata);
  return JSONtoken;
};

const createTokenCredentials = tokens => {

  const writeFilePromise = () => {
    return new Promise((resolve, reject) => {
      fs.writeFile("token.json", JSON.stringify(tokens, null, 2), error => {
        if (error) reject(error);
        resolve("file created successfully");
      });
    });
  };

  const writeFile = async () => {
    try {
      const response = await writeFilePromise();
      console.log(response);
      return readFile(tokens);
    }
    catch (error) {
      console.error(error);
    }
  };

  return fs.existsSync("token.json")
    ? readFile(tokens)
    : writeFile();
};

const parsedJsonToken = () => {
  return fs.existsSync("token.json") ? (isJSONEmpty(fs.readFileSync("token.json"))) ? false : JSON.parse(fs.readFileSync("token.json")) : false;
 }

const main = async (name, email, key) => {
  let tokens;
  
  if(parsedJsonToken()){
    tokens = parsedJsonToken()
  }else{
    return 'permission';
  }

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_ADDRESS,
      clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
      clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expires: tokens.expiry_date
    }
  });

  let message = {
    from: '"Boom Camp Handraiser" <no-reply@boom.camp>',
    to: email,
    subject: "Authentication Key",
    text: `Good Day ${name}! Here's your authentication key for your initial login: ${key}`, // plain text body
    html: `Good Day ${name}! Here's your authentication key for your initial login: ${key}` // html body
  };

  const sendEmailFn = () => {
    return new Promise((resolve, reject) => {
      transporter.sendMail(message, (error, info) => {
        if (error) {
          console.log("Error occurred");
          reject(error);
          return;
        }
        resolve(`Message sent to ${info.messageId} successfully! ${info.response}`)
        transporter.close();
      });
    })
  }

  try {
    const sent = await sendEmailFn();
    console.log(sent);
    return 'true';
  } catch (error) {
    console.error(error);
    return 'false';
  }
};

module.exports = {
  fetchToken: (req, res) => {
    getToken(res.req.query.code)
    .then(result => {
      res.status(200).send(result);
    })
    .catch(error => {
      res.status(500).end();
    })
  },
  permission: (req, res) => {
    res.status(200).send(generateAuthURL());
  },
  main
};
