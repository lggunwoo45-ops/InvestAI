FROM node:22-alpine
WORKDIR /app
COPY backend/market-data ./market-data
COPY backend/news ./news
COPY backend/research ./research
ENV HOST=0.0.0.0 PORT=8790
EXPOSE 8790
USER node
CMD ["node", "market-data/server.mjs"]
