# Use an official Python runtime as a base image
FROM python:3.10

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . /app

# Install dependencies
RUN pip install -r requirements.txt

# Expose port 5000 (or the port your app uses)
EXPOSE 5000

ENTRYPOINT ["/app/start.sh"]
