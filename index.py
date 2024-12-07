import discord
from discord.ext import commands, tasks
import os
import logging
import pytz
from datetime import datetime
from discord_utils import send_command_list, send_gif, send_rko, send_nba_summary_message_embed_in_channel

# Regex patterns for RKO commands
import re

from logger import logger 

rko_regex_comp = re.compile(r"!rko <@!")
rko_regex_phone = re.compile(r"!rko <@")

# Command dictionary
Commands = {
    "!vibes": "https://media.giphy.com/media/I1mNkDcsedsNjCr4LB/giphy-downsized-large.gif",
    "!ayo": "https://media.giphy.com/media/zGlR7xPioTWaRXGZDZ/giphy.gif",
    "!soon": "https://media.giphy.com/media/tzHn7A5mohSfe/giphy.gif",
    "!pause": "https://media.giphy.com/media/ai1UxGMqU7G5TZQmJa/giphy.gif",
    "commands": send_command_list,
}

CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO = {
    os.getenv("NBA_CHAT_CHANNEL_ID") : send_nba_summary_message_embed_in_channel
}

EASTERN = pytz.timezone("America/New_York")

# Intents
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.guilds = True
intents.reactions = True
intents.members = True

# Create bot client
client = commands.Bot(command_prefix="!", intents=intents)


# Define East Coast timezone

@tasks.loop(minutes=1)  # Check every minute
async def check_new_day():
    """Checks if it's the start of a new day in East Coast time."""
    now = datetime.now(EASTERN)
    logger.info(now.hour)
    if now.hour == 0 and now.minute == 0:  # Midnight in East Coast time
        for channel_id, callback in CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.items():
            channel_id = int(channel_id)  # Replace with your channel ID
            channel = client.get_channel(channel_id)
            if channel:
                await callback(channel)

@check_new_day.before_loop
async def before_check_new_day():
    """Wait until the bot is ready before starting the task."""
    logger.info("banana")
    await client.wait_until_ready()

@client.event
async def on_ready():
    logger.info(f"Logged in as {client.user}!")
    check_new_day.start()

@client.event
async def on_message(msg):
    try:
        if msg.content in Commands:
            await send_gif(msg, Commands[msg.content])
        elif msg.content == "!commands":
            await Commands["commands"](msg)
        elif rko_regex_comp.match(msg.content) or rko_regex_phone.match(msg.content):
            person_to_rko = msg.content.split(" ")[1]
            await send_rko(msg, person_to_rko)
    except Exception as e:
        logger.error(e)

# Start the bot
client.run(os.getenv("CLIENT_TOKEN"))