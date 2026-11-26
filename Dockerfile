FROM node:24.22.3-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY src ./src
COPY public ./public
COPY tests ./tests
COPY scripts ./scripts
COPY docs ./docs
COPY AGENTS.md ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production DB_PATH=/app/data/catraca.sqlite PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]
