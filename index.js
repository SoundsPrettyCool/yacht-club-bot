import { Client, Intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";

import {
  sendTraitFloorPrice,
  sendFloorPrice,
  sendCommandList,
  sendGif,
  sendSuccessOrFailureMessageCreateGiveaway,
  sendSuccessOrFailureMessageEndGiveaway,
  sendWalletEntrySucceessOrFailureMessage,
  sendWalletAddresses,
  sendWinners,
  sendWalletVerificationSuccessOrFailure,
  sendWalletInputFailureMessage,
  sendSmilesssWithPercentageFromOpenSea,
  sendUpdateWalletEntryStatusForGiveaway,
  sendCurrentGiveawayStatus,
  addRoleToWinners,
  removeRoleForWinners,
  kickUserForBattleGame,
  sendListOfKillers,
  beginBattle,
  send6kMessageEmbed,
  sendUpdateMessageEmbed,
  sendRko
} from "./discord_utils.js";

import pkg from "pg";

const smilesssIDRegex = new RegExp(
  "!smilesss (?:[1-9][0-9]{0,4}(?:.d{1,2})?|100000)"
);

const smilesss6kIDRegex = new RegExp(
  "!6ksmilesss (?:[1-9][0-9]{0,4}(?:.d{1,2})?|100000)"
);

const smilesssTraitFloorRegex = new RegExp("!floor [a-zA-Z]+:[a-zA-Z]+");
const ethWalletRegex = new RegExp("!wallet:0x[a-fA-F0-9]{40}$");
const ethWalletRegexSpace = new RegExp("!wallet: 0x[a-fA-F0-9]{40}$");
const walletCommandRegex = new RegExp("!wallet");
const kickPlayerRegexComp = new RegExp("!kick <@!");
const kickPlayerRegexPhone = new RegExp("!kick <@");
const rkoRegexComp = new RegExp("!rko <@!");
const rkoRegexPhone = new RegExp("!rko <@");

const channelsToPostSmilesssAndFloor = [
  //production
  "919127614717820941",
  "919127614717820942",
  "919127614717820943",
  "919127614717820944",
  "919475715345375292",
  //staging
  "920170972160589824",
  "911007274598813716",
  "909193938445934592",
  "909192890666856478",
  "909193199988387880",

  //development
  "928726955279401053",
  "928726955279401054",
  "928726955279401055",
  "928726955279401056",
  "928726955279401057"
];

const allowedGiveawayChannels = [
  //staging giveaways-bot
  "919127615086927928",

  //production giveaways-bot
  "879083959621943346",

  //development
  "928726955988230159",

  //Not Sure
  "927950707733200957"
];

const channelsToTestPlayKickBattle = [
  //production
  "933890087891124324",

  //development
  "934864752360968242",

  //staging
  "934864965414826044",
  //testing
  "934905615812268092"
];

const Commands = {
  smilesssIdPercentage: sendSmilesssWithPercentageFromOpenSea,
  traitFloor: sendTraitFloorPrice,
  floor: sendFloorPrice,
  "!vibes":
    "https://media.giphy.com/media/I1mNkDcsedsNjCr4LB/giphy-downsized-large.gif",
  "!ayo": "https://media.giphy.com/media/zGlR7xPioTWaRXGZDZ/giphy.gif",
  "!blueprint": "https://i.imgur.com/sRthP2B.png",
  "!BingBong": "https://media.giphy.com/media/BT0rUpCcIaiEbjmsTc/giphy.gif",
  "!bingbong": "https://media.giphy.com/media/BT0rUpCcIaiEbjmsTc/giphy.gif",
  "!soon": "https://media.giphy.com/media/tzHn7A5mohSfe/giphy.gif",
  "!mayo": "https://media.giphy.com/media/ydRwVu2J8PKPC/giphy.gif",
  "!bagsignal": "https://i.imgur.com/Ae1mkLG.jpg",
  "!BBG": "https://i.imgur.com/p6BKXdp.jpg",
  "!bbg": "https://i.imgur.com/p6BKXdp.jpg",
  "!pause": "https://media.giphy.com/media/ai1UxGMqU7G5TZQmJa/giphy.gif",
  commands: sendCommandList,
  createGiveaway: sendSuccessOrFailureMessageCreateGiveaway,
  endgiveaway: sendSuccessOrFailureMessageEndGiveaway,
  walletInput: sendWalletEntrySucceessOrFailureMessage,
  fetchWalletAddresses: sendWalletAddresses,
  walletFailedInput: sendWalletInputFailureMessage,
  verifyWallet: sendWalletVerificationSuccessOrFailure,
  fetchwinners: sendWinners,
  openWalletEntry: sendUpdateWalletEntryStatusForGiveaway,
  closeWalletEntry: sendUpdateWalletEntryStatusForGiveaway,
  checkwalletentrystatus: sendCurrentGiveawayStatus,
  addroletowinners: addRoleToWinners,
  removeroleforwinners: removeRoleForWinners,
  warzoneKick: kickUserForBattleGame,
  showListOfKillers: sendListOfKillers,
  beginBattle: beginBattle,
  show6ksmilesss: send6kMessageEmbed,
  showUpdate: sendUpdateMessageEmbed
};

const { Pool } = pkg;
dotenv.config();

let clientDB;
if (process.env.NODE_ENV === "production") {
  clientDB = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else if (process.env.NODE_ENV === "development") {
  clientDB = new Pool({
    connectionString: process.env.DATABASE_URL
  });
}

// clientDB.connect();

const queue = [];

setInterval(() => {
  if (queue.length > 0) {
    const msgCallback = queue.shift();
    msgCallback();
  }
}, 2000);

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
    if (
      smilesssIDRegex.test(msg.content) &&
      channelsToPostSmilesssAndFloor.includes(msg.channel.id)
    ) {
      await Commands.smilesssIdPercentage(
        msg,
        queue,
        MessageEmbed,
        smilesssIDRegex
      );
    } else if (
      smilesssTraitFloorRegex.test(msg.content) &&
      msg.channel.id === "919475715345375292"
    ) {
      Commands.traitFloor(msg, smilesssTraitFloorRegex);
    } else if (
      msg.content === "!floor" &&
      channelsToPostSmilesssAndFloor.includes(msg.channel.id)
    ) {
      Commands.floor(msg, queue);
    } else if (Commands[msg.content]) {
      sendGif(msg, Commands[msg.content], MessageEmbed);
    } else if (msg.content === "!commands") {
      Commands.commands(msg, MessageEmbed);
    } else if (
      msg.content === "!creategiveaway" &&
      allowedGiveawayChannels.includes(msg.channel.id)
    ) {
      Commands.createGiveaway(msg, MessageEmbed, clientDB, client);
    } else if (
      msg.content === "!endgiveaway" &&
      allowedGiveawayChannels.includes(msg.channel.id)
    ) {
      Commands.endgiveaway(msg, clientDB, client);
    } else if (
      ethWalletRegex.test(msg.content) ||
      ethWalletRegexSpace.test(msg.content)
    ) {
      let walletInputStr;
      if (ethWalletRegexSpace.test(msg.content)) {
        walletInputStr = msg.content.split(" ").join("");
      } else {
        walletInputStr = msg.content;
      }

      Commands.walletInput(msg, ethWalletRegex, clientDB, walletInputStr);
    } else if (msg.content === "!fetchwalletaddress") {
      Commands.fetchWalletAddresses(msg, clientDB);
    } else if (
      walletCommandRegex.test(msg.content) &&
      !ethWalletRegex.test(msg.content)
    ) {
      Commands.walletFailedInput(msg);
    } else if (msg.content === "!verifywallet") {
      Commands.verifyWallet(msg, clientDB);
    } else if (msg.content === "!fetchwinners") {
      Commands.fetchwinners(msg, clientDB);
    } else if (msg.content === "!openwalletentry") {
      Commands.openWalletEntry(clientDB, msg, true);
    } else if (msg.content === "!closewalletentry") {
      Commands.closeWalletEntry(clientDB, msg, false);
    } else if (msg.content === "!checkwalletentrystatus") {
      Commands.checkwalletentrystatus(clientDB, msg);
    } else if (msg.content === "!addroletowinners") {
      Commands.addroletowinners(clientDB, client, msg);
    } else if (msg.content === "!removeroleforwinners") {
      Commands.removeroleforwinners(clientDB, client, msg);
    } else if (
      (kickPlayerRegexComp.test(msg.content) ||
        kickPlayerRegexPhone.test(msg.content)) &&
      channelsToTestPlayKickBattle.includes(msg.channel.id)
    ) {
      Commands.warzoneKick(client, msg);
    } else if (
      msg.content === "!showKillers" &&
      channelsToTestPlayKickBattle.includes(msg.channel.id)
    ) {
      Commands.showListOfKillers(client, msg);
    } else if (
      msg.content === "!beginBattle" &&
      channelsToTestPlayKickBattle.includes(msg.channel.id)
    ) {
      Commands.beginBattle(client, msg);
    } else if (smilesss6kIDRegex.test(msg.content)) {
      await Commands.show6ksmilesss(msg, MessageEmbed, smilesss6kIDRegex);
    } else if (msg.content === "!update") {
      console.log("banana");
      Commands.showUpdate(msg, MessageEmbed);
    } else if (
      rkoRegexComp.test(msg.content) ||
      rkoRegexPhone.test(msg.content)
    ) {
      const personToRko = msg.content.split(" ")[1];
      // await sendRko(msg, MessageEmbed, personToRko);
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(process.env.CLIENT_TOKEN);
