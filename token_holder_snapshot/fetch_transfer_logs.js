import * as EtherscanApi from "etherscan-api";
import * as fs from "fs";
import * as dotenv from "dotenv";
import Web3 from "web3";
const web3 = new Web3("https://cloudflare-eth.com");

let api = null;
const ContractAddress = "0x177ef8787ceb5d4596b6f011df08c86eb84380dc"; // contract

async function getTransferEvents() {
  let empty = false;
  let fromBlock = parseInt("0", 16);
  let latestBlock = "latest";

  const logger = fs.createWriteStream("data/logs.json");
  logger.write(`[\n`);

  while (!empty) {
    const createLogs = (
      await api.log.getLogs(
        ContractAddress, // address
        fromBlock, // fromBlock
        latestBlock, // toBlock
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        null,
        null // creation
      )
    ).result;

    if (createLogs.length === 0) {
      empty = true;
    }
    for (
      let smilesssTransfer = 1;
      smilesssTransfer <= createLogs.length;
      smilesssTransfer++
    ) {
      var log = createLogs[smilesssTransfer - 1];
      const fromAddress = web3.eth.abi.decodeParameter(
        "address",
        log.topics[1]
      );
      const toAddress = web3.eth.abi.decodeParameter("address", log.topics[2]);
      const tokenId = web3.eth.abi.decodeParameter("uint256", log.topics[3]);

      const transferInfo = {
        fromAddress,
        toAddress,
        tokenId,
        transactionHash: log.transactionHash
      };

      const data = {
        logs: [
          {
            ...log
          }
        ],
        transferInfo
      };
      logger.write(`${JSON.stringify(data, null, 2)},\n`);
      console.log(data);
    }

    const lastLog = createLogs[createLogs.length - 1];
    const last_block_num = lastLog.blockNumber;
    fromBlock = parseInt(last_block_num, 16);
    await new Promise((r) => setTimeout(r, 1000));
  }

  logger.write(`]\n`);
}

async function init() {
  dotenv.config();
  var etherscanApiKey = process.env.ETHERSCAN_API_KEY;
  if (!etherscanApiKey) {
    throw new Error("Missing ETHERSCAN_API_KEY");
  }
  api = EtherscanApi.init(etherscanApiKey);
}

async function main() {
  try {
    await init();
    await getTransferEvents();
  } catch (error) {
    console.log(error);
  }
}

main();
