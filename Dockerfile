FROM node:21

WORKDIR /app

COPY package*.json ./

ENV TZ=Europe/Berlin

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && npm install

COPY . .

EXPOSE ${NODE_PORT_INTERN}

CMD ["node", "src/server.js"]