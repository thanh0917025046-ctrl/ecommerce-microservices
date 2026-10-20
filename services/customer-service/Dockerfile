FROM node:22-alpine
WORKDIR /app
COPY services/customer-service/package*.json ./services/customer-service/
RUN cd services/customer-service && npm install --omit=dev
COPY proto ./proto
COPY services/customer-service ./services/customer-service
WORKDIR /app/services/customer-service
CMD ["npm", "start"]
