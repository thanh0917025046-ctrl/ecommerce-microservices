FROM node:22-alpine
WORKDIR /app
COPY services/product-service/package*.json ./services/product-service/
RUN cd services/product-service && npm install --omit=dev
COPY proto ./proto
COPY services/product-service ./services/product-service
WORKDIR /app/services/product-service
CMD ["npm", "start"]
