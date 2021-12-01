# Config

https://hub.docker.com/_/kong

Whenever the config changes!

- `make build`
- `docker-compose up`
- browser: `http://localhost:8080`
- username: `sascha@example.com`

Rebuild nginx (make build) whenever nginx.conf changes!

curl -X POST http://localhost:8001/services/cat-fact/plugins \
--data "name=cors"  \
--data "config.origins=*" \
--data "config.methods=GET" \
--data "config.methods=POST" \
--data "config.methods=DELETE" \
--data "config.methods=PUT" \

## Use demo

http://localhost:8080