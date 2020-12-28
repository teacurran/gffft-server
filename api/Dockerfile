FROM quay.io/quarkus/centos-quarkus-maven:20.2.0-java11

WORKDIR /usr/src/app

USER root
RUN chown -R quarkus ./
USER quarkus

COPY ./ ./

RUN mvn -f pom.xml install -DskipTests

EXPOSE 8080 5005
