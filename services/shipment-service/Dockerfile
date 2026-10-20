FROM node:22-alpine
WORKDIR /app
COPY services/shipment-service/package*.json ./services/shipment-service/
RUN cd services/shipment-service && npm install --omit=dev
COPY proto ./proto
COPY services/shipment-service ./services/shipment-service
WORKDIR /app/services/shipment-service
CMD ["npm", "start"]
