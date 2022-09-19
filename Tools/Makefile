build_all:
	mvn clean package
	rm -fr dist
	mkdir dist
	cp target/tools-1.0-SNAPSHOT-jar-with-dependencies.jar dist/ClientSecretGenerator.jar
	cp README.md dist/README.md