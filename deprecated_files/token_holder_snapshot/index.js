import fs from "fs";
import Web3 from "web3";
import fetch from "node-fetch";

const web3 = new Web3("https://cloudflare-eth.com");

async function getBlockNumber() {
  const latestBlockNumber = await web3.eth.getBlockNumber();
  console.log(latestBlockNumber);
  return latestBlockNumber;
}
const ContractAddress = "0x177ef8787ceb5d4596b6f011df08c86eb84380dc";
async function getContractAbi() {
  const response = await fetch(
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${ContractAddress}&apikey=4JXCAYY2JWF56T7KJW985GHMSISRA4RMKE`
  );
  const data = await response.json();
  // console.log(JSON.parse(data.result))
  return JSON.parse(data.result);
  // return data.result
}

async function getTokenId(token) {
  const resp = await sheepProxyContract.methods;
  const account = await resp.ownerOf(token).call();
  return account;
}

// getTokenId(7802)

async function getAllAddressesForToken() {
  const contractABI = await getContractAbi();
  const smilesssContract = new web3.eth.Contract(contractABI, ContractAddress);

  let token = 1368;
  const logger = fs.createWriteStream("addresses.txt", {
    flags: "a" // 'a' means appending (old data will be preserved)
  });

  // logger.write('some data') // append string to your file
  // logger.write('more data') // again
  // logger.write('and more') // again

  while (token < 8726) {
    const address = await smilesssContract.methods.ownerOf(token).call();
    console.log(token);
    token += 1;
    logger.write(`${address}\n`);
  }
}

getAllAddressesForToken();

async function makeUniqueAddress() {
  const data = fs.readFileSync("addresses.txt", "UTF-8");

  // split the contents by new line
  const lines = data.split(/\r?\n/);
  const h = {};
  lines.forEach((wallet_address) => {
    h[wallet_address] = true;
    console.log(wallet_address);
  });

  console.log(Object.keys(h).length);
}

// getAllAddressesForToken();
// makeUniqueAddress();
