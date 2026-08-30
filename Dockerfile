FROM node:22-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]