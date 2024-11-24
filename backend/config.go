package main


type Config struct {
  host string;
  port string;
}

func MakeConfig(
  args []string,
  getenv func(string) string,
) Config{
  
  
  return Config{
    host: "",
    port: "8080",
  }
}
