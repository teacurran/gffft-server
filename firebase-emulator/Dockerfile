FROM us-central1-docker.pkg.dev/gffft-auth/gffft/gffft-firebase-emulator:base

# Install app dependencies
COPY ./functions/package.json ./functions/package-lock.json ./

RUN npm install --unsafe-perm --ignore-scripts=false --verbose

RUN npm rebuild --verbose sharp

ADD ./functions/firebase.json /app/firebase.json
COPY ./functions/ /app
RUN npm run build

RUN npm --version
RUN firebase --version
EXPOSE 4000 5000 9099 9199 8080
