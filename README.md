# Config

https://hub.docker.com/_/kong

Load Kong static config:

- `bew install httpie` // one time

Whenever the config changes!

- `http :8001/config config=@kong_config.yml`

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