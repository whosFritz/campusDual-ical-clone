# BA-Leipzig-Schedule-Clone

This project is a Node.js server that fetches data from the BA-Leipzig self-service platform and provides it in an iCalendar format (ICS). The server uses MongoDB to store event data.

## Why This Project?

The Campus Dual self-service platform is not user-friendly, so I programmed my own internet calendar (webcal) to provide a better experience.

## Prerequisites

- Docker
- Docker Compose
- Node.js
- npm

## Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/ba-leipzig-schedule-clone.git
    cd ba-leipzig-schedule-clone
    ```

2. **Create environment variables file**

    Create a `.env` file in the project directory with the following content:

    ```env
    USER_ID=your_user_id
    USER_HASH=your_user_hash
    DB_URI=your_mongodb_uri
    NODE_PORT_EXTERN=your_external_node_port
    NODE_PORT_INTERN=your_internal_node_port
    MONGODB_PORT=your_external_mongodb_port
    ```

    An example file is also provided in the repository.

3. **Install dependencies**

    Install the Node.js dependencies:

    ```bash
    npm install
    ```

## Docker Configuration

Ensure that your `docker-compose.yml` file looks as follows:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: my_mongo_db
    ports:
      - "${MONGODB_PORT}:27017"
    volumes:
      - mongo_data:/data/db

  node:
    build: .
    container_name: node_app
    ports:
      - "${NODE_PORT_EXTERN}:${NODE_PORT_INTERN}"
    env_file:
      - .env
    depends_on:
      - mongodb
    volumes:
      - ./logs:/app/logs

volumes:
  mongo_data:
