#!/bin/sh

# Simple script to set configure the tutorial
#
if [ "$HOSTNAME" ]
then
  printf 'setting protocol and hostname in web.xml and spa-demo.js'
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/WEB-INF/web.xml
  sed -i "s+@@service_location@@+$HOSTNAME+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
else
  printf 'HOSTNAME is not set\n'
fi
if [ "$BASEURL" ]
then
  printf 'setting base_url in index.html\n'
  sed -i "s+{base_url}+$BASEURL+g" /usr/local/tomcat/webapps/ROOT/index.html
else
  printf 'BASEURL is not set\n'
fi
if [ "$WEBCLIENTID" ]
then
  printf 'setting web clientId in index.html\n'
  sed -i "s+{web-sdk-client_id}+$WEBCLIENTID+g" /usr/local/tomcat/webapps/ROOT/index.html
else
  printf 'WEBCLIENTID is not set\n'
fi
if [ "$KONGLOCATION" ]
then
  printf 'setting Kong location\n'
  sed -i "s+@@kong_location@@+$KONGLOCATION+g" /usr/local/tomcat/webapps/ROOT/index.html
  sed -i "s+@@kong_location@@+$KONGLOCATION+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
else
  sed -i "s+@@kong_location@@+http://localhost:8090+g" /usr/local/tomcat/webapps/ROOT/index.html
  sed -i "s+@@kong_location@@+http://localhost:8090+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
fi
if [ "$OIDC_PUBLIC_CLIENT_ID" ]
then
  printf 'setting the public OIDC client_id\n'
  sed -i "s+@@oidc_public_client_id@@+$OIDC_PUBLIC_CLIENT_ID+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js

  if [ "$OIDC_CONFIG_ENDPOINT" ]
  then
    printf 'setting the OIDC config endpoint\n'
    sed -i "s+@@oidc_config_endpoint@@+$OIDC_CONFIG_ENDPOINT+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  else
    printf 'the OIDC config endpoint has not been configured, setting default\n'
    sed -i "s+@@oidc_config_endpoint@@+https://oauth2.loginid.io/.well-known/openid-configuration+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  fi

  if [ "$OIDC_REDIRECT_PUBLIC_CLIENT" ]
  then
    printf 'setting the OIDC redirect_uri\n'
    sed -i "s+@@oidc_public_client_redirect@@+$OIDC_REDIRECT_PUBLIC_CLIENT+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  else
    printf 'the OIDC redirect_uri has not been configured, setting default\n'
    sed -i "s+@@oidc_public_client_redirect@@+http://localhost/oidc.html+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  fi

  if [ "$OIDC_SCOPE" ]
  then
    printf 'setting the OIDC scope\n'
    sed -i "s+@@oidc_scope@@+$OIDC_SCOPE+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  else
    printf 'the OIDC scope has not been configured, setting default\n'
    sed -i "s+@@oidc_scope@@+openid+g" /usr/local/tomcat/webapps/ROOT/script/spa-demo.js
  fi

else
  printf 'the public OIDC client_id has not been configured. The client will be disabled\n'
fi

# configures the listen port for tomcat
#
if [ "$PORT" ]
then
  printf 'setting port\n'
  sed -i "s/@@port@@"/${PORT}/g /usr/local/tomcat/conf/server.xml
else
    printf 'setting default port: 80\n'
    sed -i "s/@@port@@"/80/g /usr/local/tomcat/conf/server.xml
fi

# run the original tomcat entry point command as specified in tomcat's Dockerfile
#
sh /usr/local/tomcat/bin/catalina.sh run