FROM node:erbium

WORKDIR /app

RUN yarn global add firebase-tools

ADD ./firebase.json /app/firebase.json

RUN firebase --version
EXPOSE 9099 9199
