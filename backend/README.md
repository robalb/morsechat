# morsechat

## development

The server has no configuration defaults: every value must be provided through
its environment variable or flag, and startup fails with a list of anything
missing. See the [configuration table](../README.md#configuration) for the
required values. `go run cmd/morsechat/main.go` loads `.env` from this directory
when the file exists, so you can copy `../.env.example` to `.env`, set `SECRET`,
and start the app.

To run all tests: `go test ./...`

## database interaction

This app uses sqlite with the sqlc code generator to run typesafe queries in golang.
If you want to add, remove or modify the current database queries or schema as defined in `internal/db/query.sql` and
`internal/db/schema.sql` you will also need to install and run the sqlc generator:

- install sqlc:

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.27.0
```

- generate the sql models:

```bash
sqlc generate
```

## A tour of the codebase

This is a webserver that implements a rest api, a websocket endpoint, and interacts with a sqlite database.
The entry point to understand the codebase is in `cmd/morsechat/main.go`. The whole repository is organized for maximal testability, following the wise advices in this article: https://grafana.com/blog/2024/02/09/how-i-write-http-services-in-go-after-13-years/

## production build

https://github.com/golang/go/issues/26492


    go build -tags 'osusergo,netgo,static,' -ldflags '-extldflags "-static"' cmd/morsechat/main.go

