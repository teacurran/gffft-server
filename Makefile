THIS_FILE := $(lastword $(MAKEFILE_LIST))
PROJECT_NAME = $(notdir $(PWD))
CMD_ARGUMENTS ?= $(cmd)
.PHONY: clean build

build:
	# Stop existing images, and build all images in parallel
	docker-compose down --remove-orphans
	docker-compose build --parallel

start:
	COMPOSE_HTTP_TIMEOUT=200 docker-compose up --remove-orphans

stop:
	docker-compose down

test:
	@make test-api

test-api:
	docker-compose -f docker-compose.yml -f docker-compose.test.yml up --exit-code-from api-integration-test api-integration-test

rebuild:
	docker-compose build --no-cache --parallel

rebuild-test:
	docker-compose -f docker-compose.yml -f docker-compose.test.yml build api-integration-test

clean:
	@docker-compose down --remove-orphans --rmi all 2>/dev/null \
	&& echo 'Image(s) removed.' \
	|| echo 'Image(s) already removed.'

prune:
	# Clean all that is not actively used
	docker system prune -af