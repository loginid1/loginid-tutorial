build:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .