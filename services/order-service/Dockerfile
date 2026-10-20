FROM node:22-alpine
WORKDIR /app
COPY services/order-service/package*.json ./services/order-service/
RUN cd services/order-service && npm install --omit=dev
COPY proto ./proto
COPY services/order-service ./services/order-service
WORKDIR /app/services/order-service
CMD ["npm", "start"]
