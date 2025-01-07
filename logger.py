import logging
import os

# Create a logger
logger = logging.getLogger("bot_logger")
logger.setLevel(logging.INFO)  # Set logger to capture INFO and above (INFO, ERROR, CRITICAL)

# Create console handler for stdout
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)  # Console will log INFO, ERROR, CRITICAL

# Create file handler for a log file
log_file = os.getenv("LOG_FILE_PATH", "bot.log")  # Default to local bot.log
try:
    os.makedirs(os.path.dirname(log_file), exist_ok=True)  # Ensure the log directory exists
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.INFO)  # File will log INFO, ERROR, CRITICAL
except Exception as e:
    print(f"File logging could not be set up: {e}")
    file_handler = None

# Create a logging format
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
if file_handler:
    file_handler.setFormatter(formatter)

# Add handlers to the logger
logger.addHandler(console_handler)
if file_handler:
    logger.addHandler(file_handler)

# Prevent duplicate logs
logger.propagate = False
