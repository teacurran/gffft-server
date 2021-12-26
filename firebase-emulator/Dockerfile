FROM timbru31/java-node:jdk-14-fermium

WORKDIR /app

RUN yarn global add firebase-tools

ADD ./firebase.json /app/firebase.json

RUN firebase --version
EXPOSE 5000 9099 9199 8080
