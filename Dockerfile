#
# This image runs the demo website and user management backend
#
FROM tomcat:9.0.56-jdk11-corretto

RUN rm -rf /usr/local/tomcat/webapps/*

RUN mkdir -p /usr/local/tomcat/webapps/ROOT/WEB-INF/lib
RUN mkdir -p /opt/docker/loginid
RUN touch /opt/docker/loginid/config

COPY UserMgmt/web /usr/local/tomcat/webapps/ROOT
COPY UserMgmt/target/user-mgmt-1.0-SNAPSHOT-jar-with-dependencies.jar /usr/local/tomcat/webapps/ROOT/WEB-INF/lib/userMgmt.jar

ADD --chmod=755 docker-build/add-ons/tomcat/entrypoint.sh /opt/entrypoint.sh

CMD ["/opt/entrypoint.sh"]