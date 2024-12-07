const sendRko = async (msg, MessageEmbed, personToRko) => {
  const embed = new MessageEmbed()
  .setTitle(`Ayooo!!`)
  .setImage("https://media.giphy.com/media/603fNl3rKum0f3jqBj/giphy.gif");
  
  await msg.channel.send({ embeds: [embed] });
  await msg.channel.send(`AYOOO! ${personToRko}`);
};
export {
  sendRko,
};
