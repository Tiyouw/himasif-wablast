# WaBlast HIMASIF — image (Next.js + Baileys worker dalam satu image)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
COPY --from=build /app ./
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["npm", "start"]
