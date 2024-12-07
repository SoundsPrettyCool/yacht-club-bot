const smilesssIDRegex = new RegExp(
  "!smilesss (?:[1-9][0-9]{0,4}(?:.d{1,2})?|100000)"
);

const msgContent = "selling !smilesss 8278";

console.log(msgContent.match(smilesssIDRegex)[0].split(" "));
