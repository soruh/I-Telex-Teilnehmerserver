# Introduction:

This is the subscription server for the I-Telex system.

The program consists of 3 processes:

## the [web server](./docs/webserver.md):

which allows manual altering of the database over http

## the [binary server](./docs/binaryserver.md):

which responds to requests unsing the I-Telex Protocol
and synchronises with version 1 servers

## the [REST api](./docs/api.md):

which responds to REST API calls
and syncronises with version 2 servers


# further documentation
  - [setup](./docs/setup.md)
  - [usage](./docs/usage.md)
  - [configuration](./docs/config.md)