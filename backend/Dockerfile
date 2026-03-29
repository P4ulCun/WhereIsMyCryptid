# Use official Python runtime as a parent image (slim version for smaller size)
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by OpenCV and other native packages
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose default port (Render will override this dynamically)
EXPOSE 8000

# Run uvicorn server in production mode
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}