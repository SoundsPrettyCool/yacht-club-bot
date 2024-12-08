# Use an official Python runtime as a base image
FROM python:3.10

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
# Install dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

COPY . /app
ENTRYPOINT ["/app/start.sh"]
