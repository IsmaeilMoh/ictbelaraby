FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server.js ict-live-feed-702a.js ict-public-markets-702c2.js ./
COPY ict_phase2d ./ict_phase2d
COPY ict_phase2e ./ict_phase2e
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
HEALTHCHECK --interval=60s --timeout=5s --start-period=90s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>r.json()).then(d=>{if(!d.active)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
