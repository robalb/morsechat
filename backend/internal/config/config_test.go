package config

import "testing"

func TestSetViaEnv(t *testing.T) {

	args := []string{
		"morsechat",
	}
	getenv := func(key string) string {
		switch key {
		case "PORT":
			return "4321"
		case "HOST":
			return "localhost"
		default:
			return ""
		}
	}
	c, _ := MakeConfig(args, getenv)
	if c.Port != "4321" {
		t.Fatal("Test set port via env")
	}
	if c.Host != "localhost" {
		t.Fatal("Test set host via env")
	}

}

func TestConfigOrder(t *testing.T) {

	args := []string{
		"morsechat",
		"--host", "0.0.0.0",
		"--port", "42",
		"--sqlite_path", "name.sqlite",
	}
	getenv := func(key string) string {
		switch key {
		case "PORT":
			return "999"
		case "HOST":
			return "bad"
		default:
			return ""
		}
	}
	c, _ := MakeConfig(args, getenv)
	if c.Port != "42" {
		t.Fatal("Test override port")
	}
	if c.Host != "0.0.0.0" {
		t.Fatal("Test override host")
	}
	if c.SqlitePath != "name.sqlite" {
		t.Fatal("Test set sqlite path")
	}

}
