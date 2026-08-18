require('dotenv').config();
const DEFAULT_MONGODB_URI = "mongodb+srv://anuragaparaitech_db_user:3vkPtfwjR9gTUdu3@m0cluster.enzenq7.mongodb.net/mailblast?retryWrites=true&w=majority&appName=M0cluster";
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = DEFAULT_MONGODB_URI;
}

const app = require('../server');

module.exports = app;
