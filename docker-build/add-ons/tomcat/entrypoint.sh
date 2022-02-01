#!/bin/sh

if [ "$HOSTNAME" ]
then
  echo 'setting protocol and hostname in web.xml and spa-demo.js'
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/WEB-INF/web.xml
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
fi
if [ "$BASEURL" ]
then
  echo 'setting base_url in index.html'
  sed -i "s+{base_url}+$BASEURL+g" /usr/local/tomcat/webapps/ROOT/index.html
fi
if [ "$WEBCLIENTID" ]
then
  echo 'setting web clientId in index.html'
  sed -i "s+{web-sdk-client_id}+$WEBCLIENTID+g" /usr/local/tomcat/webapps/ROOT/index.html
fi

# run the original tomcat entry point command as specified in tomcat's Dockerfile
#
sh /usr/local/tomcat/bin/catalina.sh run