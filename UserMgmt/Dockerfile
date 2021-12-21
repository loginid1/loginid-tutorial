FROM tomcat:9.0.56-jdk11-corretto

RUN rm -rf /usr/local/tomcat/webapps/*

RUN mkdir -p /usr/local/tomcat/webapps/ROOT/WEB-INF/lib
RUN mkdir -p /opt/docker/loginid
RUN touch /opt/docker/loginid/config

COPY web /usr/local/tomcat/webapps/ROOT
COPY target/user-mgmt-1.0-SNAPSHOT-jar-with-dependencies.jar /usr/local/tomcat/webapps/ROOT/WEB-INF/lib/userMgmt.jar

#RUN addgroup tomcat
#RUN adduser -SG tomcat tomcat
#RUN chown -R tomcat:tomcat /usr/local/tomcat/