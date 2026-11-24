# ICT بالعربي 8C.8 — production image: include ALL runtime modules.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server.js ict-live-feed-702a.js ict-public-markets-702c2.js safety-gates.js execution-quotes.js ./
COPY ict_phase2d ./ict_phase2d
COPY ict_phase2e ./ict_phase2e
# Verify runtime dependencies during image build, before a server can be deployed.
RUN node -e "for (const x of ['./server.js','./safety-gates.js','./execution-quotes.js']) require(x); console.log('Monitor runtime dependencies OK')" \
    && mkdir -p /data && chown node:node /data
USER node
EXPOSE 8787
# Docker liveness should not claim execution-readiness, but must detect a dead loop.
HEALTHCHECK --interval=60s --timeout=5s --start-period=90s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>r.json()).then(d=>{if(!d.active)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
