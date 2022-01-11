#!/bin/sh
# vim:sw=4:ts=4:et

## Add simple logic to set a different hostname for demo services
#
if [ "$HOSTNAME" ]
then
  echo 'setting protocol and hostname in nginx.conf and spa-demo.js'
  sed -i "s+http://localhost+$HOSTNAME+g" /etc/nginx/nginx.conf
  sed -i "s+http://localhost+$HOSTNAME+g" /usr/share/nginx/html/script/spa-demo.js
fi
if [ "$BASEURL" ]
then
  echo 'setting base_url in index.html'
  sed -i "s+{base_url}+$BASEURL+g" /usr/share/nginx/html/index.html
fi
if [ "$WEBCLIENTID" ]
then
  echo 'setting web clientId in index.html'
  sed -i "s+{web-sdk-client_id}+$WEBCLIENTID+g" /usr/share/nginx/html/index.html
fi
### end

set -e

if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    exec 3>&1
else
    exec 3>/dev/null
fi

if [ "$1" = "nginx" -o "$1" = "nginx-debug" ]; then
    if /usr/bin/find "/docker-entrypoint.d/" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then
        echo >&3 "$0: /docker-entrypoint.d/ is not empty, will attempt to perform configuration"

        echo >&3 "$0: Looking for shell scripts in /docker-entrypoint.d/"
        find "/docker-entrypoint.d/" -follow -type f -print | sort -V | while read -r f; do
            case "$f" in
                *.sh)
                    if [ -x "$f" ]; then
                        echo >&3 "$0: Launching $f";
                        "$f"
                    else
                        # warn on shell scripts without exec bit
                        echo >&3 "$0: Ignoring $f, not executable";
                    fi
                    ;;
                *) echo >&3 "$0: Ignoring $f";;
            esac
        done

        echo >&3 "$0: Configuration complete; ready for start up"
    else
        echo >&3 "$0: No files found in /docker-entrypoint.d/, skipping configuration"
    fi
fi

exec "$@"
