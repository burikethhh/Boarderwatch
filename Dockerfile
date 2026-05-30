FROM node:18

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server/ .

RUN mkdir -p data streams uploads

EXPOSE 3000

CMD ["node", "src/index.js"]
