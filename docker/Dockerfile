FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY dist/ ./dist/
COPY src/db/init.sql ./src/db/
COPY src/db/seed.sql ./src/db/

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server.js"]