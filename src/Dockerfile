FROM node:latest

WORKDIR /app 

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=9285

EXPOSE 3769

CMD [ "npm", "start" ]

