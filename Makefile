build:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	mvn -f ./UserMgmt/pom.xml clean package
	docker build --tag local/usermgmt --no-cache ./UserMgmt
