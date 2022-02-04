#!/bin/sh

# Simple script to set configure the tutorial
#
if [ "$HOSTNAME" ]
then
  printf 'setting protocol and hostname in web.xml and spa-demo.js'
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/WEB-INF/web.xml
  sed -i "s+@@service_location@@+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
else
  printf 'HOSTNAME is not set'
fi
if [ "$BASEURL" ]
then
  printf 'setting base_url in index.html'
  sed -i "s+{base_url}+$BASEURL+g" /usr/local/tomcat/webapps/ROOT/index.html
else
  printf 'BASEURL is not set'
fi
if [ "$WEBCLIENTID" ]
then
  printf 'setting web clientId in index.html'
  sed -i "s+{web-sdk-client_id}+$WEBCLIENTID+g" /usr/local/tomcat/webapps/ROOT/index.html
else
  printf 'WEBCLIENTID is not set'
fi
if [ "$KONGLOCATION" ]
then
  printf 'setting Kong location'
  sed -i "s+@@kong_location@@+$KONGLOCATION+g" /usr/local/tomcat/webapps/ROOT/tabs/kong.tab.html
  sed -i "s+@@kong_location@@+$KONGLOCATION+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
else
  sed -i "s+@@kong_location@@+http://localhost:8090+g" /usr/local/tomcat/webapps/ROOT/tabs/kong.tab.html
  sed -i "s+@@kong_location@@+http://localhost:8090+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
fi
if [ "$OIDCPUBLICCLIENTID" ]
then
  printf 'setting the public OIDC client_id'
  sed -i "s+@@oidc_public_client_id@@+$OIDCPUBLICCLIENTID+g" /usr/local/tomcat/webapps/ROOT/script/oidc-client.js
else
  printf 'the public OIDC client_id has not been configured'
fi
if [ "$OIDCPUBLICLIENTREDIRECT" ]
then
  printf 'setting the public OIDC client_id'
  sed -i "s+@@oidc_public_client_redirect@@+$OIDCPUBLICLIENTREDIRECT+g" /usr/local/tomcat/webapps/ROOT/script/oidc-client.js
else
  printf 'the public OIDC client_id has not been configured, setting default'
  sed -i "s+@@oidc_public_client_redirect@@+$OIDCPUBLICLIENTREDIRECT+g" /usr/local/tomcat/webapps/ROOT/script/oidc-client.js
fi

# configures the listen port for tomcat
#
if [ "$PORT" ]
then
  printf 'setting port'
  sed -i "s/@@port@@"/${PORT}/g /usr/local/tomcat/conf/server.xml
else
    printf 'setting default port: 80'
    sed -i "s/@@port@@"/80/g /usr/local/tomcat/conf/server.xml
fi

# run the original tomcat entry point command as specified in tomcat's Dockerfile
#
sh /usr/local/tomcat/bin/catalina.sh run