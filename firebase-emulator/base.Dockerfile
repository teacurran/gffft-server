FROM timbru31/java-node:17

WORKDIR /app

# RUN apt-get update
# RUN apt-get install -y libvips libvips-dev libvips-tools

# for when using alpine (not compatible with AMD64)
# RUN apk add vips vips-dev vips-tools fftw-dev gcc g++ make libc6-compat

RUN npm install -g firebase-tools

# Install app dependencies
COPY ./functions/package.json ./functions/package-lock.json ./

RUN npm install --unsafe-perm --ignore-scripts=false --verbose

# RUN npm rebuild --verbose sharp
ADD ./functions/firebase.json /app/firebase.json
COPY ./functions/ /app
RUN npm run build

RUN npm --version
RUN firebase --version
EXPOSE 4000 5000 9099 9199 8080
