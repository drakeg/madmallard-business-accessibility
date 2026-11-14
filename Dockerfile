FROM node:24.22.1-bookworm-slim
ENV NODE_ENV=production CHROMIUM_PATH=/usr/bin/chromium PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation && rm -rf /var/lib/apt/lists/* && groupadd -g 10001 app && useradd -u 10001 -g app -m app
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
RUN mkdir data && chown -R app:app /app
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --start-period=45s --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.js"]
