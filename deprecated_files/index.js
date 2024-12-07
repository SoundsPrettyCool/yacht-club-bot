import { Client, Intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";

import {
  sendCommandList,
  sendGif,
  sendRko
} from "./discord_utils.js";

dotenv.config();

const rkoRegexComp = new RegExp("!rko <@!");
const rkoRegexPhone = new RegExp("!rko <@");

const Commands = {
  "!vibes":
    "https://media.giphy.com/media/I1mNkDcsedsNjCr4LB/giphy-downsized-large.gif",
  "!ayo": "https://media.giphy.com/media/zGlR7xPioTWaRXGZDZ/giphy.gif",
  "!soon": "https://media.giphy.com/media/tzHn7A5mohSfe/giphy.gif",
  "!pause": "https://media.giphy.com/media/ai1UxGMqU7G5TZQmJa/giphy.gif",
  commands: sendCommandList,
};

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MEMBERS
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
}); //create new client

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (msg) => {
  try {
    if (Commands[msg.content]) {
      sendGif(msg, Commands[msg.content], MessageEmbed);
    } else if (msg.content === "!commands") {
      Commands.commands(msg, MessageEmbed);
    } else if (
      rkoRegexComp.test(msg.content) ||
      rkoRegexPhone.test(msg.content)
    ) {
      const personToRko = msg.content.split(" ")[1];
      await sendRko(msg, MessageEmbed, personToRko);
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(process.env.CLIENT_TOKEN);
