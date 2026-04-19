FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public/ ./public/

VOLUME ["/data"]

ENV PORT=3000
ENV DATA_FILE=/data/jarvis.json
ENV DEFAULT_USERNAME=admin
ENV DEFAULT_PASSWORD=admin
ENV SESSION_SECRET=change-me-in-production

EXPOSE 3000

CMD ["node", "server.js"]
