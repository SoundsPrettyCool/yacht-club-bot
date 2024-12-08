#!/bin/bash

# Check if ENVIRONMENT is set to 'dev'
if [ "$BOT_ENVIRONMENT" = "dev" ]; then
    # Load .env file if it exists
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
else
    echo "Skipping .env file loading: BOT_ENVIRONMENT is not 'dev'."
fi

# Run the application
exec python /app/index.py