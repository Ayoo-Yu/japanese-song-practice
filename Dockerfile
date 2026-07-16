FROM node:22.22.0-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 4173

CMD ["pnpm", "start"]
