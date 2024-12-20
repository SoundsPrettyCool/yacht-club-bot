import discord
from discord.ext import commands, tasks
import os
import logging
from datetime import datetime, timezone

from discord_utils import send_command_list, send_gif, send_rko, send_nba_summary_message_embed_in_channel, attempt_to_send_message, send_mma_live_odds, get_sport_odds, EASTERN

# Regex patterns for RKO commands
import re

from logger import logger 

rko_regex_comp = re.compile(r"!rko <@!")
rko_regex_phone = re.compile(r"!rko <@")

NBA_CHAT = "nba-chat"
MMA_CHAT = "mma-chat"
MMA = "mma"
# Command dictionary
Commands = {
    "!ayo": "https://media.giphy.com/media/zGlR7xPioTWaRXGZDZ/giphy.gif",
    "!soon": "https://media.giphy.com/media/tzHn7A5mohSfe/giphy.gif",
    "!pause": "https://media.giphy.com/media/ai1UxGMqU7G5TZQmJa/giphy.gif",
    "commands": send_command_list,
}

CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO = {
    os.getenv("NBA_CHAT_CHANNEL_ID") : {
        "callback": send_nba_summary_message_embed_in_channel,
        "name": NBA_CHAT
    }
}

ODD_TRACKING_CHANNELS = {
    MMA: {
        "channel_id": os.getenv("MMA_CHAT_CHANNEL_ID"),
        "callback": send_mma_live_odds,
        "channel": MMA_CHAT, 
        "sport_id": 8,
        "since": None,
        "odds_seen": {}
    }
}


# Intents
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.guilds = True
intents.reactions = True
intents.members = True

# Create bot client
client = commands.Bot(command_prefix="!", intents=intents)


@tasks.loop(minutes=1)  # Check every minute
async def start_live_odd_tracking(sport_to_start_live_odds):
    """Checks if it's the start of a new day in East Coast time."""
    logger.info("another minute has passed")
    sport_id = ODD_TRACKING_CHANNELS[sport_to_start_live_odds]["sport_id"]
    since = ODD_TRACKING_CHANNELS[sport_to_start_live_odds]["since"] 
    channel_id = int(ODD_TRACKING_CHANNELS[sport_to_start_live_odds]["channel_id"])
    channel = client.get_channel(channel_id)

    if not since: 
        response = get_sport_odds(sport_id) 
        target_timestamp = response["last"]
        last_event = []
        events = response["events"]
        # Convert the target timestamp to a datetime object
        target_datetime = datetime.fromtimestamp(target_timestamp, tz=timezone.utc)

        # Find the event closest to the target timestamp
        closest_event = min(
            events,
            key=lambda x: abs(
                datetime.fromisoformat(x['starts']).replace(tzinfo=timezone.utc) - target_datetime
            )
        )
        last_event.append(closest_event)
        ODD_TRACKING_CHANNELS[sport_to_start_live_odds]["since"] = target_timestamp
        await send_mma_live_odds(channel, last_event, ODD_TRACKING_CHANNELS, sport_to_start_live_odds)
    else:
        response = get_sport_odds(sport_id, since) 
        events = response["events"]
        await send_mma_live_odds(channel, events, ODD_TRACKING_CHANNELS, sport_to_start_live_odds)
    


@tasks.loop(minutes=1)  # Check every minute
async def check_new_day():
    """Checks if it's the start of a new day in East Coast time."""
    now = datetime.now()

    if now.hour == int(os.getenv("NBA_LEAGUE_SCORE_SUMMARY_TIME_HOUR")) and now.minute == int(os.getenv("NBA_LEAGUE_SCORE_SUMMARY_TIME_MINUTE")):  # Midnight in East Coast time
        logger.info("It's a new day, lets send the daily messages for each channel")

        expected_number_of_channels_to_send_msgs_to = len(CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.keys())
        logger.info(f"""Expecting to send messages to {len(CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.keys())} channels""")

        amount_of_messages_sent = 0
        for channel_id, channel_attributes in CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.items():
            logger.info
            channel_id = int(channel_id)
            try:
                await attempt_to_send_message(client, channel_id, channel_attributes)
                amount_of_messages_sent += 1
            except Exception as e:
                logger.info(f"""
                            There was an error retrieving the {channel_attributes["name"]} channel or 
                            sending a message to the {channel_attributes["name"]} channel.
                            error: {e}
                            """
                )

        logger.info(f"""sent {amount_of_messages_sent} messages""")
        if amount_of_messages_sent == expected_number_of_channels_to_send_msgs_to:
            logger.info("correct number of messages sent")
        else:
            logger.error("there was less/more messages sent than expected")


@check_new_day.before_loop
async def before_check_new_day():
    """Wait until the bot is ready before starting the task."""
    await client.wait_until_ready()

@client.event
async def on_ready():
    """once client is ready, this code will run"""
    logger.info(f"Logged in as {client.user}!")
    check_new_day.start()

@client.event
async def on_message(msg):
    """starting point for when a new message comes in"""
    try:
        if msg.content in Commands:
            await send_gif(msg, Commands[msg.content])
        elif msg.content == "!commands":
            await Commands["commands"](msg)
        elif rko_regex_comp.match(msg.content) or rko_regex_phone.match(msg.content):
            person_to_rko = msg.content.split(" ")[1]
            await send_rko(msg, person_to_rko)
        elif msg.content == "!startmma":
            if not start_live_odd_tracking.is_running():
                start_live_odd_tracking.start(MMA)
            else:
                logger.info("MMA live odds tracking is already running.")
        elif msg.content == "!stopmma":
            if start_live_odd_tracking.is_running():
                start_live_odd_tracking.stop()
            else:
                logger.info("MMA live odds tracking is not running.")
    except Exception as e:
        logger.error(e)

print(f"""length of client token is {len(os.getenv("CLIENT_TOKEN"))}""")
logger.info(f"""length of client token is {len(os.getenv("CLIENT_TOKEN"))}""")
# Start the bot
client.run(os.getenv("CLIENT_TOKEN"))