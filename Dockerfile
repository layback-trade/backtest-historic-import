FROM node:20-alpine

WORKDIR /home/node/app

COPY package*.json .

RUN npm i && \
    npm i tsx -g

COPY . .

CMD ["npm", "run", "dev"]