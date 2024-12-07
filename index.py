import discord
from discord.ext import commands
import os
import logging


from discord_utils import send_command_list, send_gif, send_rko, get_nba_scores, ask_chat_gpt, reply_to_message_with_embed

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

SPORTS_DATA_SUMMARY = {
    "NBA": [],
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

@client.event
async def on_ready():
    logger.info(f"Logged in as {client.user}!")

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
        elif msg.content == "!nbasummary":
            if len(SPORTS_DATA_SUMMARY["NBA"]) == 0:
                data = get_nba_scores()
                SPORTS_DATA_SUMMARY["NBA"] = data
            question_to_ask = f"""give me a quick summary of the scores for the following nba game data that is less than 1024 in length: {SPORTS_DATA_SUMMARY["NBA"]}"""
            gpt_response = ask_chat_gpt(question_to_ask)
            fields = [
                {
                    "name": "Summary", 
                    "value": gpt_response, 
                    "inline": False
                }
            ]

            message_embed_configs = {
                "title": "Response", 
                "field_configs": fields
            }
            await reply_to_message_with_embed(msg, message_embed_configs)
        elif "!askgpt" in msg.content:
            question_to_ask = msg.content.split("!askgpt")
            final_question_to_ask = " ".join(question_to_ask)
            gpt_response = ask_chat_gpt(final_question_to_ask)

            fields = [
                {
                    "name": "Response", 
                    "value": gpt_response, 
                    "inline": False
                }
            ]

            message_embed_configs = {
                "title": "Ask GPT", 
                "field_configs": fields
            }
            await reply_to_message_with_embed(msg, message_embed_configs)

    except Exception as e:
        logger.error(e)

# Start the bot
client.run(os.getenv("CLIENT_TOKEN"))