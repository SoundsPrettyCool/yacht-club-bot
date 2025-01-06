import requests
import os
from logger import logger

REDDIT_HOT_POSTS_CLIENT_ID = os.getenv("REDDIT_HOT_POSTS_CLIENT_ID")
REDDIT_HOT_POSTS_SECRET = os.getenv("REDDIT_HOT_POSTS_SECRET")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD")
REDDIT_HOT_POSTS_USER_AGENT = os.getenv("REDDIT_HOT_POSTS_USER_AGENT")
REDDIT_ACCESS_TOKEN=""

def check_reddit_access_token(func):
    async def wrapper(*args, **kwargs):
        global REDDIT_ACCESS_TOKEN
        # Code to run before the function
        if len(REDDIT_ACCESS_TOKEN) == 0:
            REDDIT_ACCESS_TOKEN = await reddit_authenticate(
                REDDIT_HOT_POSTS_CLIENT_ID, 
                REDDIT_HOT_POSTS_SECRET,
                REDDIT_HOT_POSTS_USER_AGENT
            )
        
        # Call the original function
        return await func(*args, **kwargs)
    return wrapper


async def reddit_authenticate(client_id, client_secret, user_agent):
    """
    Authenticate with Reddit API and return an access token.
    """
    logger.info("inside reddit_authenticate")
    auth = requests.auth.HTTPBasicAuth(client_id, client_secret)
    data = {"grant_type": "client_credentials"}
    headers = {"User-Agent": user_agent}

    response = requests.post("https://www.reddit.com/api/v1/access_token", auth=auth, data=data, headers=headers)
    if response.status_code == 200 and "access_token" in response.json():
        return response.json()["access_token"]
    else:
        raise Exception(f"Authentication failed: {response.status_code} - {response.text}")

@check_reddit_access_token
async def fetch_hot_posts(subreddit, limit=25):
    """
    Fetch the top hot posts from a subreddit.
    """
    logger.info("inside fetch hot posts")
    url = f"https://oauth.reddit.com/r/{subreddit}/hot"
    headers = {
        "Authorization": f"bearer {REDDIT_ACCESS_TOKEN}",
        "User-Agent": REDDIT_HOT_POSTS_USER_AGENT
    }
    params = {"limit": limit}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        posts = response.json()["data"]["children"]
        return [
            {
                "title": post["data"]["title"],
                "upvotes": post["data"]["ups"],
                "url": post["data"]["url"]
            }
            for post in posts
        ]
    else:
        raise Exception(f"Failed to fetch hot posts: {response.status_code} - {response.text}")
