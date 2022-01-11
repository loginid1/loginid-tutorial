#!/bin/sh

if [ "$HOSTNAME" ]
then
  echo 'setting protocol and hostname in web.xml'
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/WEB-INF/web.xml
fi

# run the original tomcat entry point command as specified in tomcat's Dockerfile
#
sh /usr/local/tomcat/bin/catalina.sh run