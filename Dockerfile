FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run start"]
