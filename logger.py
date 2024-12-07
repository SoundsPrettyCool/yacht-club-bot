import logging
import os

# Create a logger
logger = logging.getLogger("bot_logger")
logger.setLevel(logging.DEBUG)  # Set the logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

# Create console handler for stdout
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)  # Set level for console output

# Create file handler for a log file
log_file = "/app/logs/bot.log"  # Change path as needed
os.makedirs(os.path.dirname(log_file), exist_ok=True)  # Ensure the log directory exists
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.DEBUG)  # Set level for file output

# Create a logging format
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

# Add handlers to the logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)