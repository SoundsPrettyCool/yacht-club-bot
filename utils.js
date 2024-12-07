import dotenv from "dotenv";
dotenv.config();

async function fetchGiveaways(client, messageId) {
  try {
    const queryText = `SELECT * FROM smilesss_giveaways WHERE open = true and discord_message_id = $1`;
    const giveaways = await client.query(queryText, [messageId]);

    return giveaways.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function saveWalletAddress(client, userId, walletAaddress) {
  try {
    const queryText = `UPDATE participants SET wallet_address=$1 WHERE discord_id=$2`;
    const saveWalletResponse = await client.query(queryText, [
      walletAaddress,
      userId
    ]);
    if (saveWalletResponse.rowCount === 0) {
      return 2;
    } else {
      return 1;
    }
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchWalletAddressesForGiveaway(client, giveawayId) {
  try {
    const queryText = `SELECT wallet_address from participants JOIN giveaway_participants ON giveaway_participants.participant_id=participants.id WHERE wallet_address is not null AND giveaway_participants.giveaway_id=$1`;
    const walletAddressesQueryResposne = await client.query(queryText, [
      giveawayId
    ]);
    return walletAddressesQueryResposne.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchAllClosedGiveaways(client) {
  try {
    const queryText = `SELECT name from smilesss_giveaways WHERE open = false`;
    const giveaways = await client.query(queryText);

    return giveaways.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchAllOpenGiveaways(client) {
  try {
    const queryText = `SELECT name from smilesss_giveaways WHERE open = true`;
    const giveaways = await client.query(queryText);

    return giveaways.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchOpenGiveawayByName(client, giveawayName) {
  try {
    const queryText = `SELECT * FROM smilesss_giveaways WHERE open = true and name = $1`;
    const giveaway = await client.query(queryText, [giveawayName]);

    return giveaway.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchGiveaway(client, giveawayName) {
  try {
    const queryText = `SELECT * FROM smilesss_giveaways WHERE name = $1`;
    const giveaway = await client.query(queryText, [giveawayName]);

    return giveaway.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchParticipantsNotInParticipantsTable(client, discordIds) {
  try {
    const winnersSqlTextList = discordIds
      .map((discordId) => {
        return `'${discordId}'`;
      })
      .join(",");

    const queryText = `SELECT * FROM participants WHERE discord_id IN (${winnersSqlTextList})`;
    const winnersInParticipantsTableQuery = await client.query(queryText);

    const winnersObj = {};
    winnersInParticipantsTableQuery.rows.forEach((winnerObj) => {
      winnersObj[winnerObj.discord_id] = true;
    });
    const winnersNotInParticipantsTable = discordIds.filter((discordId) => {
      if (!winnersObj[discordId]) {
        return discordId;
      }
    });

    return winnersNotInParticipantsTable;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function createParticipantsFromWinners(client, discordIds) {
  try {
    if (discordIds.length === 0) return;
    const discordIdsOfParticipantsToAdd =
      await fetchParticipantsNotInParticipantsTable(client, discordIds);

    if (discordIdsOfParticipantsToAdd === -1) {
      throw "there was an error with fetching participants that aren't saved yet";
    }

    if (discordIdsOfParticipantsToAdd.length === 0) {
      return;
    }

    const participantsToAdd = discordIdsOfParticipantsToAdd
      .map((discord_id) => {
        return `(${discord_id}, NOW(), NOW())`;
      })
      .join(",");

    const queryText =
      `INSERT INTO participants (discord_id,created_at,updated_at) VALUES ` +
      participantsToAdd;

    await client.query(queryText);
  } catch (e) {
    console.log(e);
    return -1;
  }
}

//fetching winner ids from joins table that connects giveaways and participants
async function fetchWinnersFromGiveawayParticipantsTable(client, giveawayId) {
  try {
    const queryText = `SELECT participant_id from giveaway_participants JOIN smilesss_giveaways ON smilesss_giveaways.id=giveaway_participants.giveaway_id WHERE winner=true and giveaway_participants.giveaway_id=$1`;

    const winnersQuery = await client.query(queryText, [giveawayId]);

    const winnerDiscordIds = winnersQuery.rows.map((winner) => {
      return winner.discord_id;
    });

    return winnerDiscordIds;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchParticipants(client, discordIds) {
  try {
    const discordIdsQueryString = discordIds
      .map((discordId) => {
        return `'${discordId}'`;
      })
      .join(",");
    const queryText = `SELECT id from participants WHERE discord_id IN (${discordIdsQueryString})`;
    const participantQuery = await client.query(queryText);
    return participantQuery.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function createGiveawayParticipants(client, giveawayId, discordIds) {
  try {
    const participantsQuery = await fetchParticipants(client, discordIds);
    if (participantsQuery === -1) {
      throw "there was an error fetching the participants trying to create giveaway participants";
    }
    const participantIds = participantsQuery.map((participant) => {
      return participant.id;
    });

    const giveawayParticipantsToAddString = participantIds
      .map((id) => {
        return `(${giveawayId},${id},true,NOW(),NOW())`;
      })
      .join(",");

    const queryText =
      `INSERT INTO giveaway_participants (giveaway_id,participant_id,winner,created_at,updated_at) VALUES` +
      giveawayParticipantsToAddString;
    await client.query(queryText);
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function checkParticipantIsCurrentGiveawayWinner(client, discordId) {
  try {
    const queryText = `
    SELECT discord_id 
    FROM participants
    JOIN giveaway_participants ON participants.id=giveaway_participants.participant_id
    JOIN smilesss_giveaways ON smilesss_giveaways.id=giveaway_participants.giveaway_id
    WHERE smilesss_giveaways.current_giveaway=true AND participants.discord_id=$1
  `;
    const resp = await client.query(queryText, [discordId]);
    // console.log(resp.rows.length)
    return resp.rows.length;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function updateGiveawayStatus(client, giveawayId) {
  try {
    const queryUpdateText =
      "UPDATE smilesss_giveaways SET open = false WHERE id = $1";
    await client.query(queryUpdateText, [giveawayId]);
    return true;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function endGiveaway(client, discordClient, giveawayId, giveawayRows) {
  try {
    await client.query("BEGIN");
    const discordIds = await pickGivewayWinners(discordClient, giveawayRows);
    if (discordIds === -1) {
      throw "there was an error picking Giveaway Winners";
    }
    await createParticipantsFromWinners(client, discordIds);
    const giveawayStatusResponse = await updateGiveawayStatus(
      client,
      giveawayId
    );

    if (giveawayStatusResponse === -1) {
      throw "There was an error with updating the giveaway status";
    }

    const createGiveawayParticipantsResponse = await createGiveawayParticipants(
      client,
      giveawayId,
      discordIds
    );

    if (createGiveawayParticipantsResponse === -1) {
      throw "there was an error creating the giveawayParticipants";
    }

    const winnerIds = await fetchWinnersFromGiveawayParticipantsTable(
      client,
      giveawayId
    );

    if (winnerIds === -1) {
      throw "there was an error fetching the winners";
    }

    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    console.log(e);
    return false;
  }
}

async function createGiveaway(
  client,
  messageId,
  giveawayName,
  numberOfWinners,
  channelId
) {
  const queryText =
    "INSERT INTO smilesss_giveaways (name,discord_message_id,number_of_winners,channel_id,current_giveaway,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)";

  try {
    await client.query(queryText, [
      giveawayName,
      messageId,
      numberOfWinners,
      channelId,
      "true",
      "NOW()",
      "NOW()"
    ]);
    return true;
  } catch (e) {
    console.log(e);
    console.log("there was an error try again");
    return false;
  }
}

async function fetchGivewayParticipantsFromReactions(
  discordClient,
  messageId,
  channelId
) {
  try {
    const Message = await discordClient.channels.cache
      .get(channelId)
      .messages.fetch(messageId);

    const usersCollection = await Message.reactions.resolve("🎉").users.fetch();

    let usersIdArr = [...usersCollection.keys()];
    let finishedFetching = false;
    while (!finishedFetching) {
      const usersCollection = await Message.reactions
        .resolve("🎉")
        .users.fetch({ after: usersIdArr[usersIdArr.length - 1] });
      const newUsersIdArr = [...usersCollection.keys()];
      if (!newUsersIdArr.length) {
        finishedFetching = true;
      }
      usersIdArr = usersIdArr.concat(newUsersIdArr);
    }
    const filteredUserIds = usersIdArr.filter((userId) => {
      if (
        userId !== "926466778245259324" &&
        userId !== "915265949760880681" &&
        userId != "928724730683482133"
      ) {
        return userId;
      }
    });

    return filteredUserIds;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function pickGivewayWinners(discordClient, giveawayRows) {
  const giveaway = giveawayRows[0];

  const giveawayParticipants = await fetchGivewayParticipantsFromReactions(
    discordClient,
    giveaway.discord_message_id,
    giveaway.channel_id
  );

  if (giveawayParticipants === -1) {
    // throw "There was an error fetching the participants that reacted to the message";
    return -1;
  }

  const positionsObject = {};
  const winners = [];

  giveawayParticipants.forEach((participant, idx) => {
    positionsObject[participant] = idx;
  });

  while (
    winners.length < giveaway.number_of_winners &&
    giveawayParticipants.length > 0
  ) {
    const randomIdx = Math.floor(Math.random() * giveawayParticipants.length);
    const winner = giveawayParticipants[randomIdx];

    winners.push(winner);

    const poppedParticipant = giveawayParticipants.pop();

    if (positionsObject[poppedParticipant] !== randomIdx) {
      delete positionsObject[winner];
      giveawayParticipants[randomIdx] = poppedParticipant;
      positionsObject[poppedParticipant] = randomIdx;
    }
  }

  return winners;
}

async function fetchWinnersForGiveaway(client, giveawayId) {
  const queryText = `SELECT discord_id from giveaway_participants JOIN participants on participants.id=giveaway_participants.participant_id WHERE giveaway_id=$1`;
  const winnersQuery = await client.query(queryText, [giveawayId]);
  return winnersQuery.rows;
}

async function walletVerify(client, discordId) {
  try {
    const queryText = `SELECT wallet_address from participants where discord_id=$1 and wallet_address IS NOT null`;
    const discordIdQuery = await client.query(queryText, [discordId]);

    return discordIdQuery.rows;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function updateWalletEntryStatusForGiveaway(
  client,
  giveawayName,
  status
) {
  try {
    const queryText = `UPDATE smilesss_giveaways SET current_giveaway=$1 WHERE name=$2`;
    await client.query(queryText, [status, giveawayName]);
    return 1;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchCurrentGiveawayStatus(client, giveawayName) {
  try {
    const giveawayRows = await fetchGiveaway(client, giveawayName);
    if (giveawayRows === -1) {
      throw "there was an error fetching the giveaway";
    } else {
      return giveawayRows[0].current_giveaway;
    }
  } catch (e) {
    console.log(e);
    return -1;
  }
}

export {
  fetchGiveaways,
  createGiveaway,
  fetchOpenGiveawayByName,
  updateGiveawayStatus,
  pickGivewayWinners,
  fetchAllOpenGiveaways,
  endGiveaway,
  createParticipantsFromWinners,
  saveWalletAddress,
  fetchWalletAddressesForGiveaway,
  fetchAllClosedGiveaways,
  fetchGiveaway,
  walletVerify,
  fetchWinnersForGiveaway,
  checkParticipantIsCurrentGiveawayWinner,
  updateWalletEntryStatusForGiveaway,
  fetchCurrentGiveawayStatus
};
