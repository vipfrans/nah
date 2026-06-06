FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm@9

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
