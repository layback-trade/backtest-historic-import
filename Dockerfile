FROM node:20-alpine

WORKDIR /home/node/app

COPY package*.json .

RUN npm i

COPY . .

CMD ["npm", "run", "dev"]