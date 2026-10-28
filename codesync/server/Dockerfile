# Multi-stage production Dockerfile for CodeSync Backend
FROM node:22-alpine AS runner

WORKDIR /app

# Install python and build tools for code execution runner
RUN apk add --no-cache python3 py3-pip g++ make gcc openjdk17-jre

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create tmp directory for execution sandbox
RUN mkdir -p tmp && chmod 777 tmp

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "index.js"]
