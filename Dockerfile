FROM node:alpine
MAINTAINER qukecheng <qukichin@163.com>

WORKDIR /opt/mongodb-sidecar

COPY package.json /opt/mongodb-sidecar/package.json

RUN npm install

COPY ./src /opt/mongodb-sidecar/src
COPY .foreverignore /opt/.foreverignore

CMD ["npm", "start"]
