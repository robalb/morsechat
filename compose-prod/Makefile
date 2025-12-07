# Makefile for deploying a project with docker compose

# Configurable variables
PROJECT_FOLDER ?= morsechat-go
REMOTE_USER    ?= al
REMOTE_HOST    ?= vps
REMOTE_PATH    ?= /home/$(REMOTE_USER)/$(PROJECT_FOLDER)

# Default target
deploy: sync up

# Sync project folder to VPS
sync:
	rsync -Pavz ./$(PROJECT_FOLDER)/ $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_PATH)/

# Run docker compose remotely
up:
	ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose up -d"
down:
	ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose down"

