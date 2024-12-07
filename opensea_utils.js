import fetch from "node-fetch";

async function fetchOpenSeaNFT(serial) {
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v1/assets?token_ids=${serial}&asset_contract_address=0x177EF8787CEb5D4596b6f011df08C86eb84380dC&order_direction=desc&offset=0&limit=1`,
      {
        headers: {
          Accept: "application/json",
          "X-API-KEY": process.env.OPEN_SEA_API_KEY
        }
      }
    );
    const data = await response.json();
    return data.assets[0];
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchNFTIds(traitValue) {
  try {
    let url = new URL(
      `http://www.smilesss.com/api/metadata/ids/${traitValue.trait}/${traitValue.value}`
    );

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

function createIdsApiFormat(ids) {
  const apiFormatArr = [];
  ids.forEach((id) => {
    const apiString = `token_ids=${id}`;
    apiFormatArr.push(apiString);
  });
  return apiFormatArr.join("&");
}

async function fetchTraitFloorOpenSea(ids) {
  try {
    const response = await fetch(
      `https://api.opensea.io/wyvern/v1/orders?asset_contract_address=0x177EF8787CEb5D4596b6f011df08C86eb84380dC&payment_token_address=0x0000000000000000000000000000000000000000&bundled=false&include_bundled=false&${createIdsApiFormat(
        ids
      )}&sale_kind=0&limit=50&offset=0&order_by=eth_price&order_direction=asc`,
      {
        headers: {
          Accept: "application/json",
          "X-API-KEY": process.env.OPEN_SEA_API_KEY
        }
      }
    );
    const data = await response.json();
    return data;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

async function fetchFloorPriceOpenSea() {
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v1/collection/smilesssvrs/stats`,
      {
        headers: {
          Accept: "application/json",
          "X-API-KEY": process.env.OPEN_SEA_API_KEY
        }
      }
    );

    const data = await response.json();
    return data.stats;
  } catch (e) {
    console.log(e);
    return -1;
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function fetchGif() {
  const res = await fetch(
    "http://api.giphy.com/v1/gifs/search?q=rko&api_key=fPvxBznpZQGEE7rO14wrr6GmHxWxdwzJ&limit=10"
  );
  let data = await res.json();
  return data.data[getRandomInt(5)].embed_url;
}

export {
  fetchOpenSeaNFT,
  fetchNFTIds,
  fetchTraitFloorOpenSea,
  fetchFloorPriceOpenSea,
  fetchGif
};
