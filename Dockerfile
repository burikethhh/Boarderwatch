FROM node:22-slim

WORKDIR /app

# Install build tools needed for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ------------- Client Build ------------
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# ------------- Server Build ------------
COPY server/package*.json ./server/
RUN cd server && npm install && npm rebuild better-sqlite3

COPY server/ ./server/

# Create runtime directories
RUN mkdir -p server/data server/streams server/uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server/src/index.js"]