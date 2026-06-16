FROM node:20-alpine

WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
