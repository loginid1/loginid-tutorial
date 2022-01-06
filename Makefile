build:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	mvn -f ./java-server-side-sdk/pom.xml clean install
	mvn -f ./UserMgmt/pom.xml clean package
	docker build --tag local/usermgmt --no-cache ./UserMgmt

build_remote:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	docker build --tag dev/tooling --no-cache -f Dockerfile_tooling .

	docker run -v `pwd`:/tmp dev/tooling mvn -f "/tmp/java-server-side-sdk/pom.xml" -f "/tmp/UserMgmt/pom.xml" clean install

	docker build --tag local/usermgmt --no-cache ./UserMgmt
