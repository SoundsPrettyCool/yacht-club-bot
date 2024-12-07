import {
  fetchOpenSeaNFT,
  fetchNFTIds,
  fetchTraitFloorOpenSea,
  fetchFloorPriceOpenSea
} from "./opensea_utils.js";

import {
  createGiveaway,
  fetchOpenGiveawayByName,
  endGiveaway,
  fetchAllOpenGiveaways,
  saveWalletAddress,
  fetchWalletAddressesForGiveaway,
  fetchAllClosedGiveaways,
  fetchGiveaway,
  walletVerify,
  fetchWinnersForGiveaway,
  checkParticipantIsCurrentGiveawayWinner,
  updateWalletEntryStatusForGiveaway,
  fetchCurrentGiveawayStatus
} from "./utils.js";

import { MessageAttachment } from "discord.js";
import sharp from "sharp";
import fetch from "node-fetch";

const GuildGiveawayRoleMapper = {
  //Development
  "928726954801262602": "929538794183622748",
  //Production
  "854863033247072256": "959307901523091496",
  //Staging
  "919127613677649950": "929586992390484009"
};

const GuildKillerRolerMapper = {
  //Development
  "928726954801262602": "934870637493768212",
  //Production
  "933889955032342590": "933891282424713248",
  //Staging
  "919127613677649950": "934871116877537360"
};

function addHoursToDate(objDate, intHours) {
  const numberOfMlSeconds = objDate.getTime();
  const addMlSeconds = intHours * 60 * 60 * 1000;
  const newDateObj = new Date(numberOfMlSeconds + addMlSeconds);

  return newDateObj;
}

function addMinsToDate(objDate, intMins) {
  const numberOfMlSeconds = objDate.getTime();
  const addMlSeconds = intMins * 60 * 1000;
  const newDateObj = new Date(numberOfMlSeconds + addMlSeconds);

  return newDateObj;
}

async function paginateMessageSending(items, msg, successMessage) {
  let start = 0;
  let end = 25;
  let count = 0;

  if (items.length <= end) {
    count += items.length;
    await msg.channel.send(
      `${items.length > 0 ? items.join("") : "Nothing to send"}`
    );
  } else {
    while (end <= items.length) {
      const slicedAddresses = items.slice(start, end);
      count += slicedAddresses.length;
      const joinedAddresses = slicedAddresses.join("");
      await msg.channel.send(`${joinedAddresses}`);

      start += 25;
      end += 25;
    }

    if (start < items.length) {
      const slicedAddresses = items.slice(start);
      count += slicedAddresses.length;
      const joinedAddresses = slicedAddresses.join("");
      await msg.channel.send(`${joinedAddresses}`);
    }
  }
  if (count !== items.length) {
    await msg.reply("You did not receive all of the items you requested");
  } else {
    await msg.reply(`${successMessage}\ncount: ${items.length}`);
  }
}

async function askUserToPickFromListOfClosedOpenGiveaways(
  clientDB,
  msg,
  fetchOpenClosedGiveaways
) {
  let giveaways = await fetchOpenClosedGiveaways(clientDB);
  if (giveaways === -1) {
    msg.channel.send(
      `<@${msg.author.id}> There was an error fetching the giveaways, please try again`
    );
    return;
  }
  giveaways = giveaways.map((giveaway) => {
    return giveaway.name;
  });

  await msg.channel.send(
    `Pick a giveaway from the following list:\n${giveaways.join("\n")}`
  );

  const collectGiveawayName = await msg.channel.awaitMessages({
    max: 1,
    time: 60000
  });

  if (!collectGiveawayName.first()) {
    await msg.channel.send("timed out");
    return -1;
  }
  const giveawayName = collectGiveawayName.first().content.trim();
  return giveawayName;
}

const createMessageEmbedCommandList = (MessageEmbed) => {
  const embed = new MessageEmbed()
    .setTitle("Smilesss Bot Commands")
    .addField(
      "!smilesss <token id>",
      "You can use this command in a sentence in order to show the smilesss with the specified id (can only be used under SMILESSS MART)"
    )
    .addField(
      "!floor",
      "Get the current floor price for marketplaces (can only be used under SMILESSS MART)"
    )
    .addField("!blueprint", "Get blueprint gif created by Verifryd")
    .addField("!ayo", "Get ayo! gif")
    .addField("!mayo", "Get mayo gif")
    .addField("!bingbong or !BingBong", "Get bing bong gif")
    .addField("!soon", "Get soon gif");

  return embed;
};

const createInlineFieldGrid = (openSeaAsset) => {
  const traits = openSeaAsset.traits;
  let rows = [];

  traits.forEach((trait) => {
    if (rows.length === 0 || rows[rows.length - 1].length === 3) {
      rows.push([]);
    }

    rows[rows.length - 1].push(trait);
  });

  return rows;
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const calculateEthPrice = (totalPrice, paymentTokenDecimal) => {
  const totalPriceInt = parseInt(totalPrice);

  return totalPriceInt / 10 ** paymentTokenDecimal;
};

const create6kMessageEmbed = async (tokenId, MessageEmbed) => {
  try {
    const response = await fetch(
      `https://api.smilesss.com/metadata/smilesssvrs/${tokenId}`
    );
    const metadata = await response.json();
    const imageUrl = metadata.image;

    const embed = new MessageEmbed()
      .setTitle(`SmilesssVrs #${tokenId}`)
      .setURL(
        `https://opensea.io/assets/0x177ef8787ceb5d4596b6f011df08c86eb84380dc/${tokenId}`
      )
      .addFields({
        name: "6K Link",
        value: `[6K](${imageUrl}) <- Please click to save 6k image`
      })
      .setDescription("Sending 6k links of smilesss");

    return [embed, imageUrl];
  } catch (e) {
    console.log(e);
    console.log("There was an error sending the 6k link");
  }
};

const createUpdateMessageEmbed = async (MessageEmbed) => {
  const embed = new MessageEmbed()
    .setTitle(`Smilesss Update`)
    .addFields({
      name: "__Waheed Gio Announcement __",
      value: `There will be an announcement shortly from Waheed and Gio detailing the projects next steps`
    })

  return embed;
};

const createMessageEmbed = async (
  tokenId,
  openSeaAsset,
  lastSale,
  MessageEmbed
) => {
  const inlineFieldGrid = createInlineFieldGrid(openSeaAsset);
  const response = await fetch(
    `https://www.smilesss.com/api/metadata/${tokenId}`
  );
  const metadata = await response.json();
  const imageUrl = metadata.image;

  const embed = new MessageEmbed()
    .setTitle(`SmilesssVrs #${tokenId}`)
    .setURL(openSeaAsset.permalink)
    .addFields(
      {
        name: "Last Sale price",
        value: `${
          lastSale
            ? calculateEthPrice(
              lastSale.total_price,
              lastSale.payment_token.decimals
            )
            : "minted"
        } ${lastSale ? lastSale.payment_token.symbol : ""}`
      },
      {
        name: "Owner",
        value: `[${
          openSeaAsset.owner?.user?.username
            ? openSeaAsset.owner.user.username
            : openSeaAsset.owner.address
        }](https://opensea.io/${openSeaAsset.owner.address})`
      },
      {
        name: "6K Link",
        value: `[6K](${imageUrl})`
      }
    )
    .setImage(openSeaAsset.image_preview_url);

  inlineFieldGrid.forEach((row) => {
    row.forEach((trait) => {
      const percentage = (trait.trait_count / 8888) * 100;
      embed.addField(
        trait.trait_type,
        `${trait.value}: ${percentage.toFixed(2)}%`,
        true
      );
    });

    embed.addField("\u200B", "\u200B");
  });

  return embed;
};

async function sendSmilesssWithPercentageFromOpenSea(
  msg,
  queue,
  MessageEmbed,
  smilesssIDRegex
) {
  const tokenId = msg.content.match(smilesssIDRegex)[0].split(" ")[1];
  const openSeaAsset = await fetchOpenSeaNFT(tokenId); //fetches an URL from the API

  if (openSeaAsset === -1) {
    const msgCallback = () => {
      msg.reply("Looks like there was an error with opensea. Please try later");
    };

    queue.push(msgCallback);
  } else {
    const lastSale = openSeaAsset.last_sale;

    const embed = await createMessageEmbed(
      tokenId,
      openSeaAsset,
      lastSale,
      MessageEmbed
    );
    msg.reply("Message incoming");

    const msgCallback = () => {
      msg.reply({ embeds: [embed] }); //send the image URL
    };

    queue.push(msgCallback);
  }
}

function isNum(val) {
  return !isNaN(val);
}

async function sendTraitFloorPrice(msg, smilesssTraitFloorRegex) {
  const traitTitleValueArr = msg.content
    .match(smilesssTraitFloorRegex)[0]
    .split(" ")[1]
    .split(":");

  const traitValueObj = {
    trait: capitalizeFirstLetter(traitTitleValueArr[0].toLowerCase()),
    value: capitalizeFirstLetter(traitTitleValueArr[1].toLowerCase())
  };

  msg.reply("Message Incoming");
  const idsObject = await fetchNFTIds(traitValueObj);

  if (idsObject === -1) {
    msg.reply(
      "Looks like there was an error with opensea. Please try again later"
    );
  } else {
    const openseaOrders = await fetchTraitFloorOpenSea(idsObject.ids);
    if (openseaOrders === -1) {
      msg.reply(
        "Looks like there was an error with opensea. Please try again later"
      );
    } else {
      const ethPrice = calculateEthPrice(
        openseaOrders.orders[0].current_price,
        openseaOrders.orders[0].payment_token_contract.decimals
      );
      const symbol = openseaOrders.orders[0].payment_token_contract.symbol;
      msg.reply(
        `${traitValueObj.value} OpenSea Floor price: ${ethPrice} ${symbol}`
      );
    }
  }
}

async function sendFloorPrice(msg, queue) {
  const openSeaStats = await fetchFloorPriceOpenSea();
  if (openSeaStats === -1) {
    const msgCallback = () => {
      msg.reply("Looks like there was an error with opensea. Please try later");
    };
    queue.push(msgCallback);
  } else {
    msg.reply("Message incoming");
    const msgCallback = () => {
      msg.reply(`Opensea Floor: ${openSeaStats.floor_price} eth`);
    };
    queue.push(msgCallback);
  }
}

function createMessageEmbedBlueprint(url, MessageEmbed) {
  const embed = new MessageEmbed()
    .setTitle("Blueprint")
    .addField(
      "Notion Link",
      "[Blueprint](https://smilesss.notion.site/The-Blueprint-abda9841f351407da4ebc74d80c6a390)",
      true
    )
    .setThumbnail(url);
  return embed;
}

function createMessageEmbedGif(gifUrl, MessageEmbed) {
  const embed = new MessageEmbed().setImage(gifUrl);
  return embed;
}

async function sendGif(msg, gifUrl, MessageEmbed) {
  if (msg.content === "!blueprint") {
    const msgEmbed = createMessageEmbedBlueprint(gifUrl, MessageEmbed);
    console.log(msgEmbed);
    await msg.reply({ embeds: [msgEmbed] });
  } else {
    const msgEmbed = createMessageEmbedGif(gifUrl, MessageEmbed);
    await msg.reply({ embeds: [msgEmbed] });
  }
}

function sendCommandList(msg, MessageEmbed) {
  const commandEmbed = createMessageEmbedCommandList(MessageEmbed);
  msg.reply({ embeds: [commandEmbed] }); //send the image URL
}

async function sendSuccessOrFailureMessageCreateGiveaway(
  msg,
  MessageEmbed,
  clientDB,
  client
) {
  try {
    await msg.channel.send("What are you giving away?");
    const collectGiveaway = await msg.channel.awaitMessages({
      max: 1,
      time: 60000
    });
    if (!collectGiveaway.first()) {
      await msg.channel.send("timed out");
      return;
    }
    const giveawayName = collectGiveaway.first().content.trim() + " giveaway";

    let winnersInputCorrect = false;
    let collectNumberOfWinners;
    let numberOfWinners;

    while (!winnersInputCorrect) {
      await msg.channel.send("How many winners are in this giveaway?");
      collectNumberOfWinners = await msg.channel.awaitMessages({
        max: 1,
        time: 60000
      });
      if (!collectNumberOfWinners.first()) {
        await msg.channel.send("timed out");
        return;
      }
      numberOfWinners = collectNumberOfWinners.first().content.trim();

      if (isNum(numberOfWinners)) {
        winnersInputCorrect = true;
      }
    }

    let timeInputCorrect = false;
    let collectTime;
    let time;
    let timeDurationUnit;

    while (!timeInputCorrect) {
      await msg.channel.send(
        "How long would you like this giveaway to last? Please include an m after the response for minutes, h for hours or d for days. \nexamples: 10d 10h 2d"
      );
      collectTime = await msg.channel.awaitMessages({
        max: 1,
        time: 60000
      });
      if (!collectTime.first()) {
        await msg.channel.send("timed out");
        return;
      }
      time = collectTime.first().content.trim();
      timeDurationUnit = time[time.length - 1];

      if (
        ["h", "m", "d"].includes(time[time.length - 1]) &&
        isNum(time.slice(0, time.length - 1))
      ) {
        timeInputCorrect = true;
      }
    }

    let channelInputCorrect = false;
    let collectChannel;
    let channelIdUnTrimmed;
    let channelId;

    while (!channelInputCorrect) {
      await msg.channel.send(
        "Please enter the channel you will like this giveaway to happen in"
      );
      collectChannel = await msg.channel.awaitMessages({
        max: 1,
        time: 60000
      });
      if (!collectChannel.first()) {
        await msg.channel.send("timed out");
        return;
      }
      channelIdUnTrimmed = collectChannel.first().content.trim();

      if (
        channelIdUnTrimmed[0] === "<" &&
        channelIdUnTrimmed[1] === "#" &&
        channelIdUnTrimmed[channelIdUnTrimmed.length - 1] === ">"
      ) {
        channelInputCorrect = true;
        channelId = channelIdUnTrimmed.slice(2, channelIdUnTrimmed.length - 1);
      }
    }

    let newDate;

    if (timeDurationUnit === "m") {
      newDate = addMinsToDate(new Date(), time.slice(0, time.length - 1));
    } else if (timeDurationUnit === "h") {
      newDate = addHoursToDate(new Date(), time.slice(0, time.length - 1));
    } else if (timeDurationUnit === "d") {
      newDate = addHoursToDate(
        new Date(),
        parseInt(time.slice(0, time.length - 1)) * 24
      );
    }

    const msgEmbed = new MessageEmbed()
      .setTitle(`🎉 ${giveawayName}`)
      .addField(
        "EndDate (EST)",
        `${newDate.toLocaleString("en-US", {
          timeZone: "America/New_York"
        })}`
      )
      .addField("Reaction", "Please react with 🎉 to enter giveaway")
      .addField("Amount of Winners", numberOfWinners);

    const giveawayMessage = await client.channels.cache
      .get(channelId)
      .send({ embeds: [msgEmbed] });
    await giveawayMessage.react("🎉");

    const successfulCreateGiveaway = await createGiveaway(
      clientDB,
      giveawayMessage.id,
      giveawayName,
      numberOfWinners,
      channelId
    );

    if (!successfulCreateGiveaway) {
      msg.channel.send(
        `<@${msg.author.id}> There was an error creating your giveaway please try again`
      );
    }
  } catch (e) {
    msg.channel.send(
      `<@${msg.author.id}> There was an error creating your giveaway please try again`
    );
  }
}

async function sendSuccessOrFailureMessageEndGiveaway(msg, clientDB, client) {
  try {
    let giveawayName = await askUserToPickFromListOfClosedOpenGiveaways(
      clientDB,
      msg,
      fetchAllOpenGiveaways
    );

    if (giveawayName === -1) {
      return;
    }

    const giveawayRows = await fetchOpenGiveawayByName(clientDB, giveawayName);
    if (giveawayRows === -1) {
      msg.channel.send(
        `<@${msg.author.id}> There was an error while fetching all the giveaways to list`
      );
      return;
    }

    if (!giveawayRows.length) {
      msg.channel.send("Sorry there are no giveaways by that name");
    } else {
      //when updating giveaway status make sure to update the column in the join table so that it shows who won the giveaway.  This way if the dicord message doesnt send then you can always end the giveaway again. this function should be a transaction which updates the giveaway status and also updates the joins table to show the winners.
      const successfulGiveawayStatusUpdate = await endGiveaway(
        clientDB,
        client,
        parseInt(giveawayRows[0].id),
        giveawayRows
      );

      if (!successfulGiveawayStatusUpdate) {
        msg.channel.send(
          `<@${msg.author.id}> There was an error ending the giveaway, please try again`
        );
        return;
      }

      let winners = await fetchWinnersForGiveaway(clientDB, giveawayRows[0].id);

      if (winners === -1) {
        msg.reply(
          "There was an issue fetching the winners after ending the giveaway, please use the command to fetch winners in order to see the winners"
        );
      }

      winners = winners.map((winner) => {
        return `<@${winner.discord_id}>`;
      });
      const successMessage = "Here are all giveaway winners";
      paginateMessageSending(winners, msg, successMessage);
    }
  } catch (e) {
    console.log(e);
    msg.channel.send(
      `<@${msg.author.id}> There was an error ending the giveaway, please try again`
    );
  }
}
async function sendWalletEntrySucceessOrFailureMessage(
  msg,
  ethWalletRegex,
  clientDB,
  walletInputStr
) {
  //save wallet address to database
  const userDiscordId = msg.author.id;
  const walletAaddress = walletInputStr.match(ethWalletRegex)[0].split(":")[1];
  const isCurrentGiveawayWinner = await checkParticipantIsCurrentGiveawayWinner(
    clientDB,
    userDiscordId
  );

  if (isCurrentGiveawayWinner === -1) {
    await msg.reply(
      "There was an error checking if you're a current giveaway winner, please try again"
    );
  } else if (!isCurrentGiveawayWinner) {
    await msg.reply(
      "Sorry you have not won the current giveaway open for wallet entry"
    );
  } else {
    const saveWalletAddressResp = await saveWalletAddress(
      clientDB,
      userDiscordId,
      walletAaddress
    );

    if (saveWalletAddressResp === -1) {
      await msg.reply(
        "There was an error saving your addreses, please try again"
      );
    } else if (saveWalletAddressResp === 1) {
      await msg.reply("Wallet address was saved successfully thank you!");
    } else if (saveWalletAddressResp === 2) {
      await msg.reply("You have not won a giveaway");
    }
  }
}

async function sendWalletAddresses(msg, clientDB) {
  try {
    let giveaways = await fetchAllClosedGiveaways(clientDB);
    if (giveaways === -1) {
      msg.reply(
        `<@${msg.author.id}> There was an error fetching the giveaways, please try again`
      );
      return;
    }
    giveaways = giveaways.map((giveaway) => {
      return giveaway.name;
    });

    await msg.channel.send(
      `please enter name of the giveaway you are trying to get wallet addresses for. Pick from the following list:\n${giveaways.join(
        "\n"
      )}`
    );

    const collectGiveawayName = await msg.channel.awaitMessages({
      max: 1,
      time: 60000
    });

    if (!collectGiveawayName.first()) {
      await msg.reply("timed out");
      return;
    }
    const giveawayName = collectGiveawayName.first().content.trim();

    const giveawayRows = await fetchGiveaway(clientDB, giveawayName);
    if (giveawayRows === -1) {
      msg.reply(
        `<@${msg.author.id}> There was an error while fetching all the giveaways to list`
      );
      return;
    }
    if (giveawayRows.length === 0) {
      msg.reply(
        `<@${msg.author.id}> Sorry there are no giveaways by that name`
      );
      return;
    }

    const walletAddressesResponse = await fetchWalletAddressesForGiveaway(
      clientDB,
      giveawayRows[0].id
    );

    if (walletAddressesResponse.length === -1) {
      msg.reply(
        `<@${msg.author.id}> There was an error sending the wallet addresses`
      );
    }

    const walletAddresses = walletAddressesResponse.map((walletObj) => {
      return `${walletObj.wallet_address}\n`;
    });
    const successMessage = "Here are all wallet addresses";
    paginateMessageSending(walletAddresses, msg, successMessage);
  } catch (e) {
    console.log(e);
    return;
  }
}

async function sendWinners(msg, clientDB) {
  let giveawayName = await askUserToPickFromListOfClosedOpenGiveaways(
    clientDB,
    msg,
    fetchAllClosedGiveaways
  );

  if (giveawayName === -1) {
    return;
  }

  const giveawayRows = await fetchGiveaway(clientDB, giveawayName);
  if (giveawayRows === -1) {
    msg.channel.send(
      `<@${msg.author.id}> There was an error while fetching all the giveaways to list`
    );
    return;
  }

  if (giveawayRows.length === 0) {
    await msg.reply("There are no giveaways by that name");
  } else {
    let winners = await fetchWinnersForGiveaway(
      clientDB,
      parseInt(giveawayRows[0].id)
    );
    const winnersDiscordFormat = winners.map((winner) => {
      return `<@${winner.discord_id}>`;
    });
    const successMessage = "Here are all winners";
    await paginateMessageSending(winnersDiscordFormat, msg, successMessage);
    return winners;
  }
}

async function sendWalletVerificationSuccessOrFailure(msg, clientDB) {
  //add logic here which first fetches the current giveaways that users can verify for and then goes and verifies the wallet.  if not then users will get a false positive mesesage if they've won a giveaway in the past.
  const authorId = msg.author.id;
  const isCurrentGiveawayWinner = await checkParticipantIsCurrentGiveawayWinner(
    clientDB,
    authorId
  );

  if (isCurrentGiveawayWinner === -1) {
    await msg.reply(
      "There was an error checking if you are a winner, please try again"
    );
  } else if (!isCurrentGiveawayWinner) {
    await msg.reply("Sorry you are not a current giveaway winner");
    return;
  }

  const walletAddressRows = await walletVerify(clientDB, authorId);

  if (walletAddressRows === -1) {
    msg.reply(
      "Something went wrong while trying to fetch your address, please try again"
    );
  }
  if (walletAddressRows.length) {
    await msg.reply(
      `Successfully submitted wallet address. Wallet address: ${walletAddressRows[0].wallet_address}`
    );
  } else {
    await msg.reply(
      `Have not submitted wallet address or you have not won the giveaway`
    );
  }
}
async function sendWalletInputFailureMessage(msg) {
  await msg.reply(
    `<@${msg.author.id}> Wallet input incorrect, please try again`
  );
}

async function sendUpdateWalletEntryStatusForGiveaway(clientDB, msg, status) {
  const giveawayName = await askUserToPickFromListOfClosedOpenGiveaways(
    clientDB,
    msg,
    fetchAllClosedGiveaways
  );

  if (giveawayName === -1) {
    return;
  } else {
    const resp = await updateWalletEntryStatusForGiveaway(
      clientDB,
      giveawayName,
      status
    );

    if (resp === -1) {
      await msg.reply(
        "There was an error trying to update the wallet entry status for the giveaway you entered"
      );
    } else {
      await msg.reply("Successfully updated wallet entry status for giveaway");
    }
  }
}

async function sendCurrentGiveawayStatus(clientDB, msg) {
  const giveawayName = await askUserToPickFromListOfClosedOpenGiveaways(
    clientDB,
    msg,
    fetchAllClosedGiveaways
  );
  const currentGiveawayStatus = await fetchCurrentGiveawayStatus(
    clientDB,
    giveawayName
  );

  if (giveawayName === -1) {
    return;
  } else if (currentGiveawayStatus === -1) {
    await msg.reply("There was an error fetching the giveaway status");
  } else {
    await msg.reply(
      `Giveaway status: ${currentGiveawayStatus ? "open" : "closed"}`
    );
  }
}

async function addRoleToWinners(clientDB, client, msg) {
  try {
    const winners = await sendWinners(msg, clientDB);
    const guild = await client.guilds.fetch(msg.guildId);
    const GuildMemberManager = await guild.members;
    await msg.reply("Currently adding roles to winners, please standby");
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      try {
        const GuildMember = await GuildMemberManager.fetch(winner.discord_id);
        await GuildMember.roles.add(GuildGiveawayRoleMapper[msg.guildId]);
      } catch (e) {
        await msg.reply(`${winner.discord_id} no longer in guild`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    await msg.reply("Addition successful");
  } catch (e) {
    console.log(e);
    await msg.reply(
      "There was an error removing the roles for the winners, please try again"
    );
  }
}

async function removeRoleForWinners(clientDB, client, msg) {
  try {
    const winners = await sendWinners(msg, clientDB);

    const guild = await client.guilds.fetch(msg.guildId);
    const GuildMemberManager = await guild.members;

    await msg.reply("Currently removing roles for winners, please standby");
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      try {
        const GuildMember = await GuildMemberManager.fetch(winner.discord_id);
        await GuildMember?.roles?.remove(GuildGiveawayRoleMapper[msg.guildId]);
      } catch (e) {
        await msg.reply(`${winner.discord_id} no longer in guild`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    await msg.reply("Removal successful");
  } catch (e) {
    console.log(e);
    await msg.reply(
      "There was an error removing the roles for the winners, please try again"
    );
  }
}

async function kickUserForBattleGame(client, msg) {
  const userMention = msg.content.split(" ")[1];
  let userToBeKilledId;
  if (userMention.includes("!")) {
    userToBeKilledId = userMention.slice(3, userMention.length - 1);
  } else {
    userToBeKilledId = userMention.slice(2, userMention.length - 1);
  }
  // guild id
  const guild = await client.guilds.fetch(msg.guildId);
  const GuildMemberManager = await guild.members;
  try {
    const GuildMemberInitiatingKickCommand = await GuildMemberManager.fetch(
      msg.author.id
    );
    if (
      GuildMemberInitiatingKickCommand._roles.includes(
        GuildKillerRolerMapper[msg.guildId]
      )
    ) {
      console.log(userToBeKilledId);
      const GuildMember = await GuildMemberManager.fetch(userToBeKilledId);
      await GuildMember.roles.remove(GuildKillerRolerMapper[msg.guildId]);
      msg.reply(`You have killed <@!${userToBeKilledId}>`);
    } else {
      await msg.reply("You cannot kill after you've been killed");
    }
  } catch (e) {
    console.log(e);
    msg.reply("That user is no longer in the server");
  }
}

async function sendListOfKillers(client, msg) {
  // still need to check if this works with more than 100 people
  try {
    await msg.guild.members.fetch();
    const role = await msg.guild.roles.cache.find(
      (role) => role.name === "Killer"
    );
    const members = await role.members;
    console.log(members);

    const membertags = members.map((m) => `<@!${m.user.id}>`);
    const successMessage = "Here are all current killers";
    paginateMessageSending(membertags, msg, successMessage);
  } catch (e) {
    console.log(e);
  }
}

async function beginBattle(client, msg) {
  try {
    await msg.reply("Setting up game.  Please standby");
    const serverMembers = await msg.guild.members.fetch();
    const memberIds = Array.from(serverMembers.keys());
    const guild = await client.guilds.fetch(msg.guildId);
    const GuildMemberManager = await guild.members;
    for (let i = 0; i < memberIds.length; i++) {
      const member = memberIds[i];
      try {
        const GuildMember = await GuildMemberManager.fetch(member);
        await GuildMember.roles.add(GuildKillerRolerMapper[msg.guildId]);
      } catch (e) {
        console.log(e);
        await msg.reply(`<@!${member}> no longer in guild`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    await msg.reply("Let the games begin!");
  } catch (e) {
    console.log(e);
  }
}

const send6kMessageEmbed = async (msg, MessageEmbed, smilesss6kIDRegex) => {
  try {
    await msg.reply(
      "Please wait for your image. May take up to 3-5 minutes. Please DO NOT type command again"
    );
    const tokenId = msg.content.match(smilesss6kIDRegex)[0].split(" ")[1];
    const [embed, imageUrl] = await create6kMessageEmbed(tokenId, MessageEmbed);
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await sharp(buffer).webp({ quality: 50 }).toBuffer();
    const b64 = data.toString("base64");
    const newBuffer = Buffer.from(b64, "base64");
    const attachment = new MessageAttachment(newBuffer, "favicon.png");
    if (process.env.PFPS === "true") {
      const apiUrl = `http://api.smilesss.com/metadata/smilesssvrs/pfp/${tokenId}`;
      const response = await fetch(apiUrl);
      const metadata = await response.json();
      const imageUrl1 = metadata.image;
      const imageResponse1 = await fetch(imageUrl1);
      const arrayBuffer1 = await imageResponse1.arrayBuffer();
      const buffer1 = Buffer.from(arrayBuffer1);
      const data1 = await sharp(buffer1).webp({ quality: 50 }).toBuffer();
      const b641 = data1.toString("base64");
      const newBuffer1 = Buffer.from(b641, "base64");
      const attachment1 = new MessageAttachment(newBuffer1, "favicon.png");
      embed.addFields({
        name: "PFP Link",
        value: `[PFP Link](${imageUrl1})  <- click to go to 6k PFP`
      });
      await msg.reply({ embeds: [embed], files: [attachment, attachment1] });
    } else {
      await msg.reply({ embeds: [embed], files: [attachment] });
    }
  } catch (e) {
    console.log(e);
    console.log("there was an error sending the 6k link");
    await msg.reply(
      "There seems to be a problem fetching your 6k image. Try again, and if that doesn't work please let <@!472073678700412938> know.  We'll look into and fix the issue ASAP"
    );
  }
};

const sendUpdateMessageEmbed = async (msg, MessageEmbed) => {
  const embed = await createUpdateMessageEmbed(MessageEmbed);
  await msg.reply({ embeds: [embed] });
};
const sendRko = async (msg, MessageEmbed, personToRko) => {
  const embed = new MessageEmbed()
    .setTitle(`Ayooo!!`)
    .setImage("https://media.giphy.com/media/603fNl3rKum0f3jqBj/giphy.gif");

  await msg.channel.send({ embeds: [embed] });
  await msg.channel.send(`AYOOO! ${personToRko}`);
};

export {
  paginateMessageSending,
  askUserToPickFromListOfClosedOpenGiveaways,
  createMessageEmbedCommandList,
  createMessageEmbed,
  sendSmilesssWithPercentageFromOpenSea,
  sendTraitFloorPrice,
  sendFloorPrice,
  sendGif,
  sendCommandList,
  sendSuccessOrFailureMessageCreateGiveaway,
  sendSuccessOrFailureMessageEndGiveaway,
  sendWalletEntrySucceessOrFailureMessage,
  sendWalletAddresses,
  sendWinners,
  sendWalletVerificationSuccessOrFailure,
  sendWalletInputFailureMessage,
  sendUpdateWalletEntryStatusForGiveaway,
  sendCurrentGiveawayStatus,
  addRoleToWinners,
  removeRoleForWinners,
  kickUserForBattleGame,
  sendListOfKillers,
  beginBattle,
  send6kMessageEmbed,
  sendUpdateMessageEmbed,
  sendRko,
  isNum
};
