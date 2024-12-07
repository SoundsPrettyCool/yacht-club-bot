import { readFile } from "fs/promises";
import fs from "fs";
const json = JSON.parse(
  await readFile(new URL("./data/logs.json", import.meta.url))
);


const token_wallet = {

}
const unique_wallets = {

}

json.forEach((log) => {
  const toAddress = log.transferInfo.toAddress;
  const tokenId = log.transferInfo.tokenId;
  token_wallet[tokenId] = toAddress;
})

for(const token in token_wallet){
  unique_wallets[token_wallet[token]] = true;
}

console.log(Object.keys(unique_wallets).length);
console.log(Object.keys(token_wallet).length);

const logger = fs.createWriteStream(
  "data/token_wallet_address.json",
);

const loggerWallets = fs.createWriteStream(
  "data/unique_wallets.txt",
);

for (const wallet in unique_wallets) {
  loggerWallets.write(`${wallet}\n`);
}

logger.write(`${JSON.stringify(token_wallet, null, 2)}`);

