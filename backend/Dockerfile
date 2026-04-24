# Use a Debian-based Node.js image to allow apt-get
FROM node:24-bookworm

# Install nmap and required network utilities
RUN apt-get update && apt-get install -y nmap

# Set the working directory in the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend application code
COPY . .

# Expose the port your Express app runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
