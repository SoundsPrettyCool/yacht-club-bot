function createMessageEmbedGif(gifUrl, MessageEmbed) {
  const embed = new MessageEmbed().setImage(gifUrl);
  return embed;
}

async function sendGif(msg, gifUrl, MessageEmbed) {
  const msgEmbed = createMessageEmbedGif(gifUrl, MessageEmbed);
  await msg.reply({ embeds: [msgEmbed] });
}

const sendRko = async (msg, MessageEmbed, personToRko) => {
  const embed = new MessageEmbed()
  .setTitle(`Ayooo!!`)
  .setImage("https://media.giphy.com/media/603fNl3rKum0f3jqBj/giphy.gif");
  
  await msg.channel.send({ embeds: [embed] });
  await msg.channel.send(`AYOOO! ${personToRko}`);
};

const createMessageEmbedCommandList = (MessageEmbed) => {
  const embed = new MessageEmbed()
    .setTitle("Yacht-Club Bot Commands")
    .addField("!ayo", "Get ayo! gif")
    .addField("!soon", "Get soon gif");

  return embed;
};

function sendCommandList(msg, MessageEmbed) {
  const commandEmbed = createMessageEmbedCommandList(MessageEmbed);
  msg.reply({ embeds: [commandEmbed] }); //send the image URL
}
export {
  sendRko,
  sendCommandList,
  sendGif
};
