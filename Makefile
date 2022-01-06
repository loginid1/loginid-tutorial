# Run this if 1. it has not been run or 2. the UserMgmt has changed or 2. the web site has changed
#
build:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	docker run -v `pwd`:/tmp dev/tooling mvn -f "/tmp/UserMgmt/pom.xml" clean package
	docker build --tag local/usermgmt --no-cache ./UserMgmt

# Run this only if 1. the java SDK has changed or 2. it has not been built yet
#
build_tooling:
	docker build --tag dev/tooling --no-cache -f Dockerfile_tooling .