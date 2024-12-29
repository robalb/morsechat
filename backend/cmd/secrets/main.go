package main

import (
	"fmt"

	"github.com/robalb/morsechat/internal/config"
)

/*
This is NOT the entrypoint to the webserver.
This is a small utility function to generate valid
app secrets.
*/
func main(){
  secret := config.GenerateSecureRandomB64()
  fmt.Printf("Secret: %s\n", secret)
  fmt.Println(`Note: changing the app secret in production will
      invalidate all jwt issued with the previous secret. Message
      signatures will also change, making reports of bad messages
      sent before the secret change impossible to verify.`)
}
