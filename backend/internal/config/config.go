package config

import "flag"


type Config struct {
  Host string;
  Port string;
  SqlitePath string;
  SqliteConfig string;
}

func defaultConfig() Config{
  return Config{
    Host: "",
    Port: "8080",
    SqlitePath: "db.sqlite",
    SqliteConfig: "?_foreign_keys=true",
  }
}

// Load Configuration for the whole app, using command line args or
// env vars as a source.
// - what you set via env var will override the default value.
// - What you set via command line will override the default value
//   or what you set via env var.
func MakeConfig(
  args []string,
  getenv func(string) string,
) Config{

	c := defaultConfig()

	if hostEnv := getenv("HOST"); hostEnv != "" {
		c.Host = hostEnv
	}
	if portEnv := getenv("PORT"); portEnv != "" {
		c.Port = portEnv
	}
	if sqlitePath := getenv("SQLITE_PATH"); sqlitePath != "" {
		c.SqlitePath = sqlitePath
	}

	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	host := fs.String("host", c.Host, "Set the host")
	port := fs.String("port", c.Port, "Set the port")
	sqlitePath := fs.String("sqlite_path", c.SqlitePath, "Set the sqlite database path")
	_ = fs.Parse(args[1:])

	// Override config with command-line arguments if provided
	if *host != "" {
		c.Host = *host
	}
	if *port != "" {
		c.Port = *port
	}
	if *sqlitePath != "" {
		c.SqlitePath = *sqlitePath
	}

	return c
}
