FROM node:22-alpine
WORKDIR /app
COPY backend/market-data ./market-data
COPY backend/news ./news
COPY backend/research ./research
COPY backend/monitor ./monitor
COPY backend/cloud ./cloud
RUN apk add --no-cache su-exec \
    && sed -i 's/\r$//' /app/market-data/start-with-volume.sh \
    && chmod 0755 /app/market-data/start-with-volume.sh
ENV HOST=0.0.0.0 PORT=8790
EXPOSE 8790
USER node
ENTRYPOINT ["/app/market-data/start-with-volume.sh"]
CMD ["node", "market-data/server.mjs"]
