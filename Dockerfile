
FROM node:21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE ${NODE_PORT_INTERN}

CMD ["node", "src/server.js"]