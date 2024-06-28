# Verwenden Sie das offizielle Node.js-Image als Basis
FROM node:21

# Erstellen Sie ein Verzeichnis für die Anwendung
WORKDIR /app

# Kopieren Sie package.json und package-lock.json
COPY package*.json ./

# Installieren Sie die Abhängigkeiten
RUN npm install

# Kopieren Sie den Rest der Anwendung
COPY . .

# Exponieren Sie den Port, der vom Server verwendet wird
EXPOSE ${NODE_PORT_INTERN}

# Starten Sie den Server
CMD ["node", "server.js"]