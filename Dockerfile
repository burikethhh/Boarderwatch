FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

COPY server/ ./server/

# Create data directory
RUN mkdir -p server/data server/streams server/uploads

EXPOSE 3000

CMD ["node", "server/src/index.js"]
