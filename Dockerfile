# Use an official Node.js runtime as a parent image
FROM node

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install pnpm globally
RUN npm install -g pnpm

# Install project dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build-app

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["pnpm", "start-app"]