package config


type Config struct {
  Host string;
  Port string;
}

func MakeConfig(
  args []string,
  getenv func(string) string,
) Config{
  
  
  return Config{
    Host: "",
    Port: "8080",
  }
}
