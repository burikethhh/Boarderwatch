FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install
RUN cd server && npm rebuild better-sqlite3

# Copy server source
COPY server/ ./server/

# Create data directories
RUN mkdir -p server/data server/streams server/uploads

EXPOSE 3000

CMD ["node", "server/src/index.js"]
