FROM node:16

RUN apt-get update && apt-get install -y \
    watch

# Create app directory
RUN mkdir -p /app
WORKDIR /app

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
RUN chmod +x /wait

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm install 

# Bundle app source
COPY . /app
RUN npm run build

EXPOSE 3000 9229
CMD [ "npm", "run", "api-dev"]
