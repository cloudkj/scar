# Dockerfile for using AWS CLI. See README.md

FROM python:latest

RUN apt-get update && \
    apt-get install -y groff jq && \
    pip3 install awscli --upgrade

WORKDIR /home/aws-cli
