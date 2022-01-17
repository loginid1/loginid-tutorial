#
# This image runs the web UI
#
FROM nginx
COPY docker-build/add-ons/nginx/nginx.conf /etc/nginx/nginx.conf
COPY web/ /usr/share/nginx/html
COPY docker-build/add-ons/nginx/docker-entrypoint.sh /docker-entrypoint.sh

## Adding additional demos
#
COPY authenticate-demo/build/ /usr/share/nginx/html/finance