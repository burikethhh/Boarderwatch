FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install
RUN npm rebuild better-sqlite3

COPY server/ .

RUN mkdir -p data streams uploads

EXPOSE 3000

CMD ["node", "src/index.js"]
