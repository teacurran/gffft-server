FROM timbru31/java-node:jdk-14-fermium

WORKDIR /app

RUN apt-get update -y
RUN apt-get install -y libvips libvips-dev libvips-tools

RUN npm install -g firebase-tools

# Install app dependencies
COPY ./functions/package.json ./functions/package-lock.json ./

RUN npm install --unsafe-perm --ignore-scripts=false --verbose

RUN npm rebuild --verbose sharp

ADD ./functions/firebase.json /app/firebase.json
COPY ./functions/ /app
RUN npm run build

RUN firebase --version
EXPOSE 4000 5000 9099 9199 8080
