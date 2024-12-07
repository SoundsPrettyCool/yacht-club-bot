# Yacht-Club-Bot

# Getting Started
- To get started, get the .env file from someone that already works on project
- to test locally you should create your own bot application via the discord portal and add the client token given to the CLIENT_TOKEN env variable in your own env file.
- also make sure that you add the api keys neccessary. take a look at [api-keys-to-create](#api-keys-to-create)
- also make sure that you create a test discord server for yourself that should have the following [channels](#channels-to-create):
- after you create the channels, make sure you copy the channel id. please look up how to find the channel id via chatgpt or other source on internet. you will use this channel id to create channel id environment variables in your .env file.
- for example:
```bash
NBA_CHAT_CHANNEL_ID=1234
```
- then make sure your in an environment that has docker and docker-compose installed
- then build the docker-container
- then bring up the docker-contianer
- you should now see a message that says something along the lines that you connected successfully

# Channels to Create
1. `nba-chat`

# Channel ENV ID Names
1. `NBA_CHAT_CHANNEL_ID`

# Api Keys to Create
- in order for the bot to fetch apis locally, you need to create a rapid api account [here](https://rapidapi.com/hub) and subscribe to the following apis: 
    - [api-basketball](https://rapidapi.com/api-sports/api/api-basketball)
    - [chatgpt](https://rapidapi.com/swift-api-swift-api-default/api/gpt-4o/playground/apiendpoint_113789a0-d775-41db-8f5d-d129c3ff952b)
        - have to pay 1 dollar a month for this one
- once you create the account and subscribe you will get an api key that can be used for any api you subscribe to

# heroku commands
- building docker file in heroku env: `heroku container:push worker --app yacht-club-bot  `
- release the image:
`heroku container:release worker --app yacht-club-bot`
- to look at logs of the app:
`heroku logs --tail --app yacht-club-bot`
- restart app:
`heroku restart --app your-app-name`