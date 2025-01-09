import discord
from discord.ext import commands, tasks
import os
import logging
from datetime import datetime, timezone

from discord_utils import send_command_list, send_gif, send_rko, send_nba_summary_message_embed_in_channel, attempt_to_send_message, send_mma_live_odds, get_sport_odds, EASTERN, send_hot_posts_manager, attempt_to_send_reddit_hot_posts_message
# Regex patterns for RKO commands
import re

from logger import logger 
import signal
import asyncio

# Define a shutdown flag
should_stop = asyncio.Event()

rko_regex_comp = re.compile(r"!rko <@!")
rko_regex_phone = re.compile(r"!rko <@")

NBA_CHAT = "nba-chat"
MMA_CHAT = "mma-chat"
MMA = "mma"
NBA="NBA"
FUTBOL="FUTBOL"
TV_MOVIES="MOVIES"
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

CHANNELS_TO_TRACK_HOT_POSTS_SUBREDDITS = {
    os.getenv("NBA_CHAT_CHANNEL_ID"): {
        "subreddits": [{"subreddit_name":"nba"}],
        "callback": send_hot_posts_manager,
        "name": NBA,
        "flairs": {}
    },
    os.getenv("FUTBOL_CHAT_CHANNEL_ID"): {
        "subreddits": [{"subreddit_name":"soccer"}],
        "callback": send_hot_posts_manager,
        "name": FUTBOL,
        "flairs": {}
    },
    os.getenv("TV_MOVIES_CHAT_CHANNEL_ID"): {
        "subreddits": [{"subreddit_name":"movies"}],
        "callback": send_hot_posts_manager,
        "name": TV_MOVIES,
        "flairs": {"News"}
    },
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
async def get_hot_posts_from_subreddit():
    try:
        logger.info("checking if we're sending a new message in get_hot_posts_from_subreddit")
        logger.info("inside get_hot_posts_from_subreddit")
        def fetch_hot_posts():
            if os.getenv("TEST_NBA_SUBREDDIT_HOT_POSTS") == "TRUE":
                return True

        if fetch_hot_posts():
            logger.info("fetching hot posts")
            for channel_id, channel_attributes in CHANNELS_TO_TRACK_HOT_POSTS_SUBREDDITS.items():
                channel_id = int(channel_id)
                await attempt_to_send_reddit_hot_posts_message(client, channel_id, channel_attributes)
    except asyncio.CancelledError:
        logger.error("Task get_hot_posts_from_subreddit was cancelled.")
        raise  # Re-raise for proper task shutdown.                
    except Exception as e:
        logger.error(f"""
                    There was an error sending the hot posts from reddit: {e}
                    """)


@tasks.loop(minutes=1)  # Check every minute
async def check_new_day():
    try:
        logger.info("checking if we are going to send a message in check new day")
        def is_time_to_get_nba_data():
            now = datetime.now()
            logger.info("current date %s", now)
            if os.getenv("TEST_NBA_SCORES") == "TRUE":
                return True

            return now.hour == int(os.getenv("NBA_LEAGUE_SCORE_SUMMARY_TIME_HOUR")) and now.minute == int(os.getenv("NBA_LEAGUE_SCORE_SUMMARY_TIME_MINUTE")) # Midnight in East Coast time

        if is_time_to_get_nba_data():
            logger.info("It's a new day, lets send the daily messages for each channel")

            expected_number_of_channels_to_send_msgs_to = len(CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.keys())
            logger.info(f"""Expecting to send messages to {len(CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.keys())} channels""")

            amount_of_messages_sent = 0
            for channel_id, channel_attributes in CHANNELS_TO_BEG_OF_DAY_SEND_MESSAGES_TO.items():
                channel_id = int(channel_id)
                await attempt_to_send_message(client, channel_id, channel_attributes)
                amount_of_messages_sent += 1

            logger.info(f"""sent {amount_of_messages_sent} messages""")
            if amount_of_messages_sent == expected_number_of_channels_to_send_msgs_to:
                logger.info("correct number of messages sent")
            else:
                logger.error("there was less/more messages sent than expected")
    except asyncio.CancelledError:
        logger.error("Task get_hot_posts_from_subreddit was cancelled.")
        raise  # Re-raise for proper task shutdown.   
    except Exception as e:
        logger.error(f"""
                    There was an error retrieving the {channel_attributes["name"]} channel or 
                    sending a message to the {channel_attributes["name"]} channel.
                    error: {e}
                    """
        )

@tasks.loop(minutes=1)
async def monitor_tasks():
    if not get_hot_posts_from_subreddit.is_running():
        logger.error("get_hot_posts_from_subreddit is not running! will restart")
        get_hot_posts_from_subreddit.start()
    
    if not check_new_day.is_running():
        logger.error("check_new_day is not running! will restart")
        check_new_day.start()

@check_new_day.before_loop
async def before_check_new_day():
    """Wait until the bot is ready before starting the task."""
    try:
        await client.wait_until_ready()
    except Exception as e:
        logger.error(f"Error before starting check_new_day: {e}")

@client.event
async def on_disconnect():
    """Log disconnection details and stop tasks gracefully."""
    try:
        logger.info("Bot disconnected at %s", datetime.now().isoformat())
        
        # Log bot status
        logger.info("Bot user: %s", client.user)
        logger.info("Bot is_ready: %s", client.is_ready())
        
        # Check the running status of tasks and stop them
        if check_new_day.is_running():
            logger.info("Stopping check_new_day task.")
            check_new_day.stop()
        if start_live_odd_tracking.is_running():
            logger.info("Stopping start_live_odd_tracking task.")
            start_live_odd_tracking.stop()
        if get_hot_posts_from_subreddit.is_running():
            logger.info("Stopping get_hot_posts_from_subreddit task.")
            get_hot_posts_from_subreddit.stop()

    except Exception as e:
        logger.error(f"Error during on_disconnect: {e}")
    finally:
        logger.info("Tasks stopped and disconnection handled.")

@client.event
async def on_error(event, *args, **kwargs):
    logger.error("Error in event %s: %s", event, args)

@client.event
async def on_ready():
    """once client is ready, this code will run"""
    logger.info(f"Logged in as {client.user}!")
    check_new_day.start()
    get_hot_posts_from_subreddit.start()
    monitor_tasks.start()

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

# Modify the client.run call to gracefully handle shutdown
async def main():
    try:
        await client.start(os.getenv("CLIENT_TOKEN"))
    except asyncio.CancelledError:
        logger.info("Client stopped.")
    finally:
        await client.close()

async def graceful_shutdown():
    """Clean up tasks and ensure graceful exit."""
    start_time = datetime.now()
    logger.info("Starting graceful shutdown...")

    # Stop scheduled tasks
    if check_new_day.is_running():
        check_new_day.stop()
    if start_live_odd_tracking.is_running():
        start_live_odd_tracking.stop()
    if get_hot_posts_from_subreddit.is_running():
        get_hot_posts_from_subreddit.stop()

    # Cancel all remaining tasks
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"Task {task.get_name()} cancelled successfully.")

    try:
        await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=25)
    except asyncio.TimeoutError:
        logger.warning("Graceful shutdown exceeded timeout.")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
    finally:
        end_time = datetime.now()
        logger.info(f"Graceful shutdown completed in {end_time - start_time}.")


# Start the bot
# Run the bot with signal handling
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    # Register signal handlers
    loop.add_signal_handler(signal.SIGINT, lambda: should_stop.set())
    loop.add_signal_handler(signal.SIGTERM, lambda: should_stop.set())

    try:
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received.")
    finally:
        logger.info("Starting graceful shutdown...")
        try:
            # Call graceful_shutdown with a timeout
            loop.run_until_complete(asyncio.wait_for(graceful_shutdown(), timeout=25))  # 25-second timeout
        except asyncio.TimeoutError:
            logger.warning("Shutdown took too long, forcing termination.")
        except Exception as e:
            logger.error(f"Unexpected error during shutdown: {e}")
        finally:
            loop.close()
            logger.info("Event loop closed.")

