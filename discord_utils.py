import discord
import time
import requests
import os
import json
import pytz
from datetime import datetime, timedelta, timezone
from tenacity import retry, stop_after_attempt, wait_exponential
from reddit_utils import fetch_hot_posts
from logger import logger
from reddit_utils import reddit_authenticate, REDDIT_HOT_POSTS_CLIENT_ID, REDDIT_HOT_POSTS_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_HOT_POSTS_USER_AGENT

REDDIT_ACCESS_TOKEN = ""
EASTERN = pytz.timezone("America/New_York")

SPORTS_DATA_SUMMARY = {
    "NBA": [],
}

async def create_discord_thread(channel: discord.TextChannel, thread_name: str) -> discord.Thread:
    """
    Creates a thread in a specified Discord channel and returns the thread object.

    Args:
        channel (discord.TextChannel): The Discord channel object where the thread will be created.
        thread_name (str): The name of the thread.

    Returns:
        discord.Thread: The created thread object.
    """
    try:
        thread = await channel.create_thread(name=thread_name, type=discord.ChannelType.public_thread)
        return thread
    except Exception as e:
        print(f"Error creating thread: {e}")
        return None

async def get_last_threads(channel: discord.TextChannel, limit: int = 3) -> list[discord.Thread]:
    """
    Retrieves the last created threads in a specified Discord channel.

    Args:
        channel (discord.TextChannel): The Discord channel object to fetch threads from.
        limit (int): The number of most recent threads to return. Default is 3.

    Returns:
        list[discord.Thread]: A list of the most recently created threads.
    """
    try:
        threads =  channel.threads

        sorted_threads = sorted(
            threads,
            key=lambda t: t.created_at,
            reverse=True
        )
        return sorted_threads[:limit]
    except Exception as e:
        logger.error(f"Error fetching threads: {e}")
        return []

from datetime import datetime, timedelta

def is_thread_created_today_or_within_12_hours(thread: discord.Thread) -> bool:
    """
    Checks if a given thread was created on the current date or within the last 12 hours.

    Args:
        thread (discord.Thread): The Discord thread object to check.

    Returns:
        bool: True if the thread was created today or within 12 hours, False otherwise.
    """
    if not thread.created_at:
        return False

    # Current time in UTC
    now = datetime.now(timezone.utc)

    # Time difference between now and thread creation
    time_difference = now - thread.created_at

    # Check if the thread was created today or within the last 12 hours
    return thread.created_at.date() == now.date() or time_difference <= timedelta(hours=12)

async def fetch_or_create_thread(channel):
    now = datetime.now()
    threads = await get_last_threads(channel, 1)

    if len(threads) > 0:
        thread_created_today = is_thread_created_today_or_within_12_hours(threads[0])
        if thread_created_today:
            thread = threads[0]
            return thread
    
    return await create_discord_thread(channel, f"""MMA {now.strftime("%Y-%m-%d")} Live Odds""")

def get_sport_odds(sport_id, since=0):
    url = "https://pinnacle-odds.p.rapidapi.com/kit/v1/markets"

    if since > 0:
        querystring = {"sport_id": sport_id, "is_have_odds":"true", "since": since}
    else:
        querystring = {"sport_id": sport_id, "is_have_odds":"true"}

    headers = {
        "x-rapidapi-key": os.getenv("RAPID_API"),
        "x-rapidapi-host": "pinnacle-odds.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        response.raise_for_status()  # Raise an error for HTTP issues

        data = response.json()
        return data # Return the response content
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")
        return None

async def send_mma_live_odds(channel, events, odds_tracking_channels, sport_to_start_live_odds):
    logger.info(odds_tracking_channels)
    thread = await fetch_or_create_thread(channel)
    for event in events:
        event_id = event["event_id"]
        if event_id not in odds_tracking_channels:
            home = event["home"]
            away = event["away"]
            money_line = event["periods"]["num_0"]["money_line"]
            name=f"""Match between {home} and {away} has started"""
            value=""
            title="Tale of the Tape" 
            if money_line:
                money_line_home = money_line["home"]
                money_line_away = money_line["away"]
                money_line_draw = money_line["draw"]
                money_line_name = f"""home: {home}, away: {away}"""
                money_line_value = f"""money line, home {money_line_home}, draw {money_line_draw}, away {money_line_away}"""
                name=money_line_name
                value=money_line_value

                fields = [
                    {
                        "name": name, 
                        "value": value, 
                        "inline": False
                    }
                ]
                now = datetime.now()

                message_embed_configs = {
                    "title": title, 
                    "field_configs": fields
                }

                await send_message_in_thread(thread, message_embed_configs)
                odds_tracking_channels[sport_to_start_live_odds]["odds_seen"][event_id] = True

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def attempt_to_send_message(client, channel_id, channel_attributes):
    logger.info("Attempting to send a message")
    channel = client.get_channel(channel_id)
    if channel:
        await channel_attributes["callback"](channel)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def attempt_to_send_reddit_hot_posts_message(client, channel_id, channel_attributes):
    logger.info("Attempting to send a hot posts message")
  
    channel = client.get_channel(channel_id)
    if channel:
        await channel_attributes["callback"](channel, channel_attributes)


def shorten_game_data_with_scores(data):
    """
    Shortens game data to include scores (per quarter and total), team names, and if there was overtime.
    Args:
        data (list): List of game data dictionaries.
    Returns:
        str: A stringified JSON representation of the shortened data.
    """
    shortened_data = []
    for game in data:
        game_summary = {
            "home_team": game["teams"]["home"]["name"],
            "away_team": game["teams"]["away"]["name"],
            "scores": {
                "home": {
                    "total": game["scores"]["home"].get("total"),
                },
                "away": {
                    "total": game["scores"]["away"].get("total"),
                },
            },
            "overtime": bool(game["scores"]["home"].get("over_time") or game["scores"]["away"].get("over_time"))
        }
        shortened_data.append(game_summary)

    return shortened_data  # Ensure the string length is less than 1024 characters

def ask_chat_gpt(question_to_ask):
    """
    Ask Chat Gpt any question and receive a reply

    Args:
    str: a string with a question to ask

    Returns:
        dict: a dictionary with the response
    """

    url = "https://gpt-4o.p.rapidapi.com/chat/completions"

    payload = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": f"""{question_to_ask}"""
            }
        ]
    }
    headers = {
        "x-rapidapi-key": os.getenv("RAPID_API"),
        "x-rapidapi-host": "gpt-4o.p.rapidapi.com",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise an error for HTTP issues

        data = response.json()
        return data["choices"][0]["message"]["content"]  # Return the response content
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")
        return None

def get_nba_scores():
    """
    Fetch NBA scores for a given time period using the API-Basketball API.

    Args:

    Returns:
        arr: an array of game scores for the previous day
    """
    url = "https://api-basketball.p.rapidapi.com/games"
    headers = {
        "x-rapidapi-host": "api-basketball.p.rapidapi.com",
        "x-rapidapi-key": os.getenv("RAPID_API")
    }

    now = datetime.now(EASTERN)
    previous_day = now - timedelta(days=1)

    leagues = [12, 422]
    final_result = []

    for league in leagues:
        nba_timezone = "America/New_York"
        params = {
            "league": league,
            "season": "2024-2025",
            "date": previous_day.strftime("%Y-%m-%d"),
            "timezone": nba_timezone
        }

        logger.info("fetching games for date %s, and timezone %s", previous_day.strftime("%Y-%m-%d"), nba_timezone)
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()  # Raise an error for HTTP issues

            data = response.json()
            final_result += data["response"]
        except requests.exceptions.RequestException as e:
            logger.error(f"An error occurred: {e}")

        logger.info("waiting 5 seconds")
        time.sleep(5)
    logger.info("returning data fetched for nba scores api")
    return shorten_game_data_with_scores(final_result)

def generate_game_summaries(games):
    """
    Generates a summary of each game in Markdown format.

    :param games: List of dictionaries, each representing a game's data.
    :return: A string containing the summaries of all games in Markdown format.
    """
    logger.info("inside generate_game_summaries with arg")
    summaries = []
    for game in games:
        # Extract game details
        logger.info(game)
        home_team = game["home_team"]
        away_team = game["away_team"]
        home_score = game["scores"]["home"]["total"]
        away_score = game["scores"]["away"]["total"]
        overtime = game["overtime"]
        # Format the summary
        summary = f"__{away_team} vs. {home_team}__\n"
        if home_score is not None and away_score is not None:
            summary += f"Final Score: **{away_team} {away_score} - {home_team} {home_score}**\n"
            if overtime:
                summary += "_This game went into overtime._\n"
        else:
            summary += "_The game score is not available yet._\n"
        summaries.append(summary)

    # Join all summaries into a single Markdown string
    if len(summaries) == 0:
        return "There were not NBA games played today"

    return "\n\n".join(summaries)

async def send_nba_summary_message_embed_in_channel(channel):
    logger.info(""f"Inside send_nba_summary_message_embed_in_channel {channel.name}""")
    data = get_nba_scores()
    summary = generate_game_summaries(data)
    fields = [
        {
            "name": "Summary", 
            "value": summary, 
            "inline": False
        }
    ]
    now = datetime.now()
    previous_day = now - timedelta(days=1)

    message_embed_configs = {
        "title": f"""NBA Summary of Scores for {previous_day.strftime("%Y-%m-%d")}""", 
        "field_configs": fields
    }
    await send_message_in_channel(channel, message_embed_configs)

async def fetch_bot_messages_from_days_ago(channel, bot_id, days_ago=3):
    """
    Fetch all messages sent by a bot in a specific channel for the current day.

    Args:
        channel (discord.TextChannel): The Discord channel to search in.
        bot_id (int): The ID of the bot whose messages you want to fetch.

    Returns:
        list: A list of discord.Message objects sent by the bot today.
    """
    logger.info("inside fetch_bot_messages_from_days_ago")
    # Get the start of the current day in UTC
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(days=days_ago)

    bot_messages = []

    # Fetch messages from the channel after the start of the day
    async for message in channel.history(limit=None, after=start_time):
        if message.author.id == int(bot_id):  # Check if the message is from the bot
            bot_messages.append(message)

    return bot_messages


async def send_hot_posts(channel, posts, bot_messages):
    messages_sent = 0
    for post in posts:
        already_posted = False
        
        for bot_message in bot_messages:
            if bot_message.embeds and bot_message.embeds[0].title.lower()[:-4] in post["title"].lower():
                already_posted = True

        if not already_posted:
            fields = [
                {
                    "name": "HOT POST",
                    "value": post["url"],
                    "inline": False
                }
            ]
            title = f"""{post["title"][0:250]}...""" if len(post["title"]) >= 250 else post["title"]
            messaege_embed_configs = {
                "title": title,
                "field_configs": fields
            }
            try:
                await send_message_in_channel(channel, messaege_embed_configs)
                messages_sent += 1
                time.sleep(1)
            except Exception as e:
                logger.info("There was an error sending a message in channel %s", e)
    
    logger.info("sent %s messages", messages_sent)
 
async def send_hot_posts_manager(channel, channel_attributes):
    logger.info(""f"Inside send_nba_hot_posts {channel.name}""")
    data = []

    for subreddit in channel_attributes["subreddits"]:
        data += await fetch_hot_posts(subreddit["subreddit_name"])
    
    bot_messages = await fetch_bot_messages_from_days_ago(channel, os.getenv("BOT_ID"))
    logger.info("bot has sent %s messages over the last 3 days", len(bot_messages))

    await send_hot_posts(channel, data, bot_messages)

def get_player_stats_by_date(date):
    """
    Fetch NBA player stats for all games on a given date using the API-Basketball API.

    Args:
        date (str): The date in YYYY-MM-DD format.
        api_key (str): Your API-Basketball API key.

    Returns:
        dict: A dictionary containing player stats for all games on the specified date.
    """
    url = "https://api-basketball.p.rapidapi.com/players"
    headers = {
        "x-rapidapi-host": "api-basketball.p.rapidapi.com",
        "x-rapidapi-key": os.getenv("RAPID_API")
    }
    now = datetime.now()

    previous_day = now - timedelta(days=1)
    params = {
        "league": 12,  # League ID for NBA
        "season": 2024,  # Replace with the season you want
        "date": previous_day    # Date for which to fetch stats
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Raise an error for HTTP issues

        data = response.json()
        return data["response"]  # Return the list of player stats
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return None
            
def create_message_embed_gif(gif_url):
    """
    Create a Discord embed with a GIF image.
    """
    embed = discord.Embed()
    embed.set_image(url=gif_url)
    return embed

async def send_gif(msg, gif_url):
    """
    Send a GIF embed as a reply to a message.
    """
    msg_embed = create_message_embed_gif(gif_url)
    await msg.reply(embed=msg_embed)

async def send_rko(msg, person_to_rko):
    """
    Send an RKO message with a GIF.
    """
    embed = discord.Embed(title="Ayooo!!")
    embed.set_image(url="https://media.giphy.com/media/603fNl3rKum0f3jqBj/giphy.gif")
    await msg.channel.send(embed=embed)
    await msg.channel.send(f"AYOOO! {person_to_rko}")

def create_message_embed_command_list():
    """
    Create a Discord embed listing bot commands.
    """
    embed = discord.Embed(title="Yacht-Club Bot Commands")
    embed.add_field(name="!ayo", value="Get ayo! gif", inline=False)
    embed.add_field(name="!soon", value="Get soon gif", inline=False)
    embed.add_field(name="!pause", value="Get pause gif", inline=False)
    return embed

def create_message_embed(message_embed_configs):
    embed = discord.Embed(title=message_embed_configs["title"])

    for field_configs in message_embed_configs["field_configs"]:
        embed.add_field(name=field_configs["name"], value=field_configs["value"], inline=field_configs["inline"])

    return embed

async def send_command_list(msg):
    """
    Send the list of bot commands as a reply to a message.
    """
    command_embed = create_message_embed_command_list()
    await msg.reply(embed=command_embed)

async def reply_to_message_with_embed(msg, message_embed_configs):
    await msg.reply(embed=create_message_embed(message_embed_configs))

async def send_message_in_channel(channel, message_embed_configs):
    await channel.send(embed=create_message_embed(message_embed_configs))

async def send_message_in_thread(thread, message_embed_configs):
    await thread.send(embed=create_message_embed(message_embed_configs))


