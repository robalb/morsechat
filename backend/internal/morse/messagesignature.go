package morse

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
)

// SignedMessage represents the struct we will encrypt/decrypt
// Note: javascript does not handle int values > 2^32 when decoding json
// We can safely json encode int64 here only because it is never
// parsed by javascript. The json blobs generated from here will only
// be decoded by golang code.
type SignedMessage struct {
	Timestamp int64 `json:"t"`
	//also referred as "Session" or "sessionId", refers to the
	//identifier that uniquely identifies the device behind a
	//user request. It's what we use to ban a user, wether they
	//are anonymous or logged in
	Deviceid string `json:"d"`
	//The message that is being reported, translated into readable
	//text by a server-side morse translator
	PlainText string `json:"p"`
	//The following three fields are all user identifiers.
	//Only the ID matters, the rest is there to avoid extra DB lookups
	Userid   int64  `json:"i"`
	Username string `json:"u"`
	Callsign string `json:"c"`
}

// encryptMessage encrypts the SignedMessage struct with the given secret key
func EncryptMessage(msg SignedMessage, secretKey []byte) (string, error) {
	plainText, err := json.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("failed to marshal message: %v", err)
	}

	// Create a new AES cipher block
	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %v", err)
	}

	// Use GCM (Galois/Counter Mode) for encryption
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %v", err)
	}

	// Generate a random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %v", err)
	}

	// Encrypt the plaintext and append the nonce
	cipherText := gcm.Seal(nonce, nonce, plainText, nil)

	// Encode the ciphertext to a base64 string
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// decryptMessage decrypts the message string with the given secret key
func DecryptMessage(encryptedMessage string, secretKey []byte) (SignedMessage, error) {
	var msg SignedMessage

	// Decode the base64 encoded message
	cipherText, err := base64.StdEncoding.DecodeString(encryptedMessage)
	if err != nil {
		return msg, fmt.Errorf("failed to decode base64 message: %v", err)
	}

	// Create a new AES cipher block
	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return msg, fmt.Errorf("failed to create cipher: %v", err)
	}

	// Use GCM (Galois/Counter Mode) for decryption
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return msg, fmt.Errorf("failed to create GCM: %v", err)
	}

	// Extract the nonce from the ciphertext
	nonceSize := gcm.NonceSize()
	if len(cipherText) < nonceSize {
		return msg, fmt.Errorf("ciphertext too short")
	}
	nonce, cipherText := cipherText[:nonceSize], cipherText[nonceSize:]

	// Decrypt the ciphertext
	plainText, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return msg, fmt.Errorf("failed to decrypt message: %v", err)
	}

	// Unmarshal the JSON into the SignedMessage struct
	if err := json.Unmarshal(plainText, &msg); err != nil {
		return msg, fmt.Errorf("failed to unmarshal message: %v", err)
	}

	return msg, nil
}
