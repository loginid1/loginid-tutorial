# This is the default goal.
# This will work on a MacBook.
# - Use 'build_win' if you are working on a windows machine.
#
# Run this if 1. it has not been run or 2. the UserMgmt has changed or 3. the web site has changed
#
build:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	docker run -v `pwd`:/tmp dev/tooling mvn -f "/tmp/UserMgmt/pom.xml" clean package
	docker build --tag local/usermgmt --no-cache -f Dockerfile_userMgmt .

# The third line is specific to windows, the rest is the same as for 'build'.
# If this fails, please try one of these options:
# - make sure to run it in Powershell
# - use %cd% instead of ${PWD}
#
build_win:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	docker run -v ${PWD}:/tmp dev/tooling mvn -f "/tmp/UserMgmt/pom.xml" clean package
	docker build --tag local/usermgmt --no-cache -f Dockerfile_userMgmt .

# This builds an image that contains java 11 and Maven.
# It enables users that do not have java and maven installed locally.
# If you want to build the project without it, use 'build_local'.
#
# Run this if 1. it has not been built yet or 2. the LoginID java SDK has changed.
#
build_tooling:
	docker build --tag dev/tooling --no-cache -f Dockerfile_tooling .

# If java and maven are available run this goal instead of others.
# This is slightly faster that using 'build_tooling' and 'build/ build_win'
#
build_local:
	docker build --tag local/kongclient --no-cache .
	docker build --tag local/kong --no-cache -f Dockerfile_kong .
	mvn -f ./java-server-side-sdk/pom.xml clean install
	mvn -f ./UserMgmt/pom.xml clean package
	docker build --tag local/usermgmt --no-cache -f Dockerfile_userMgmt .