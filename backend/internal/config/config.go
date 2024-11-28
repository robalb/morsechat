package config

import "flag"


type Config struct {
  Host string;
  Port string;
}

func defaultConfig() Config{
  return Config{
    Host: "",
    Port: "8080",
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

	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	host := fs.String("host", c.Host, "Set the host")
	port := fs.String("port", c.Port, "Set the port")
	_ = fs.Parse(args[1:])

	// Override config with command-line arguments if provided
	if *host != "" {
		c.Host = *host
	}
	if *port != "" {
		c.Port = *port
	}

	return c
}
