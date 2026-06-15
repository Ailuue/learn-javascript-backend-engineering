FROM node:22-slim

WORKDIR /app

# The repo uses a single root package.json shared by all backends.
COPY package*.json ./
RUN npm ci

COPY backends/bookmark_manager ./backends/bookmark_manager

WORKDIR /app/backends/bookmark_manager
RUN npx prisma generate --schema=prisma/schema.prisma

CMD ["node", "app/server.js"]
