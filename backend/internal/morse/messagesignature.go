package morse

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

// Sign generates a HMAC-SHA256 signature for a given message using a secret key.
func Sign(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}

// Verify checks if a given signature is valid for a message and secret key.
func Verify(message, secret, signature string) error {
	expectedSig := Sign(message, secret)
	if !hmac.Equal([]byte(expectedSig), []byte(signature)) {
		return errors.New("invalid signature")
	}
	return nil
}

