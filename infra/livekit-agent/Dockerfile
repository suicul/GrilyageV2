FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY agent.mjs .
COPY audio ./audio/
CMD ["node", "agent.mjs", "start"]
