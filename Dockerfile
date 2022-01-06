#
# This image runs the web UI
#
FROM nginx
COPY docker-build/add-ons/nginx/nginx.conf /etc/nginx/nginx.conf
COPY web/ /usr/share/nginx/html