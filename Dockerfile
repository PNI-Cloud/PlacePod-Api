# Base Node.js image to use.
FROM node:10-alpine

# A pm2 instance is used as a safeguard if node.js crashes or exits.
RUN npm i -g --production pm2@4.1.2

# Directory to put the application into.
ENV APP_DIR /app
WORKDIR $APP_DIR

# Install app dependencies.
COPY package.json package-lock.json $APP_DIR/
RUN npm i

# Copy our app.
COPY . $APP_DIR

# Run unit tests. Build will stop if any of these fail!
RUN npm test

# Remove dev dependencies and tests.
RUN npm prune --production && \
    rm -rf $APP_DIR/test

# Start the server.
CMD ["pm2-docker", "Server.js"]
