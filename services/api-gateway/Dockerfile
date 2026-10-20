FROM node:22-alpine
WORKDIR /app
COPY services/api-gateway/package*.json ./services/api-gateway/
RUN cd services/api-gateway && npm install --omit=dev
COPY proto ./proto
COPY services/api-gateway ./services/api-gateway
WORKDIR /app/services/api-gateway
CMD ["npm", "start"]
