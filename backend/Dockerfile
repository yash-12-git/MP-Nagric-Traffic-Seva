# DEMO ONLY backend image. Skips Puppeteer's Chromium download (HTML fallback for
# challans); run natively if you need true PDFs.
FROM node:20-slim
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN cp -n .env.example .env || true
EXPOSE 3001
# Initialise the DB (idempotent) then start the API.
CMD ["sh", "-c", "node src/db/init.js && node src/index.js"]
