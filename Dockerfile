FROM node:alpine AS builder

WORKDIR /home/app

COPY package*.json .

RUN npm i

COPY . .

RUN npm run build

FROM node:alpine

WORKDIR /home/app

COPY package*.json .

RUN npm ci --only=production

COPY --from=builder /home/app/build ./build

CMD npm start