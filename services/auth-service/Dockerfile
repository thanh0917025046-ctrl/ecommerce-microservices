FROM node:22-alpine
WORKDIR /app
COPY services/auth-service/package*.json ./services/auth-service/
RUN cd services/auth-service && npm install --omit=dev
COPY proto ./proto
COPY services/auth-service ./services/auth-service
WORKDIR /app/services/auth-service
CMD ["npm", "start"]
