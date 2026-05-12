FROM node:20-slim

WORKDIR /app

# Clone free-claude-code proxy
RUN apt-get update && apt-get install -y git && \
    git clone https://github.com/Alishahryar1/free-claude-code.git . && \
    npm install || yarn install || pip install -r requirements.txt || true

EXPOSE 8082

CMD ["node", "index.js"]