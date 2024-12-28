package morse

import (
	"encoding/base64"
	"testing"
)

// TestEncryptMessage tests the encryption of the SignedMessage struct
func TestEncryptMessage(t *testing.T) {
	secretKey := []byte("examplekey123456") // Secret key (16 bytes)
	msg := SignedMessage{Session: "fakeuuidv4", PlainText: "Test Content"}

	encryptedMessage, err := EncryptMessage(msg, secretKey)
	if err != nil {
		t.Fatalf("EncryptMessage failed: %v", err)
	}

	// Check that the encrypted message is a valid base64 string
	if _, err := base64.StdEncoding.DecodeString(encryptedMessage); err != nil {
		t.Fatalf("encryptedMessage is not valid base64: %v", err)
	}

	if len(encryptedMessage) == 0 {
		t.Fatalf("encryptedMessage is empty")
	}
}

// TestDecryptMessage tests the decryption of an encrypted message
func TestDecryptMessage(t *testing.T) {
	secretKey := []byte("examplekey123456") // Secret key (16 bytes)
	originalMsg := SignedMessage{Session: "fakeuuidv4", PlainText: "Test Content"}

	encryptedMessage, err := EncryptMessage(originalMsg, secretKey)
	if err != nil {
		t.Fatalf("EncryptMessage failed: %v", err)
	}

	// Decrypt the message
	decryptedMessage, err := DecryptMessage(encryptedMessage, secretKey)
	if err != nil {
		t.Fatalf("DecryptMessage failed: %v", err)
	}

	// Compare the decrypted message with the original
	if decryptedMessage != originalMsg {
		t.Fatalf("decrypted message does not match the original. Got %+v, expected %+v", decryptedMessage, originalMsg)
	}
}

// TestInvalidKey tests decryption with an invalid key
func TestInvalidKey(t *testing.T) {
	secretKey := []byte("examplekey123456")      // Valid key
	invalidKey := []byte("invalidkey123456")     // Different key
	msg := SignedMessage{Session: "fakeuuidv4", PlainText: "Test Content"}

	encryptedMessage, err := EncryptMessage(msg, secretKey)
	if err != nil {
		t.Fatalf("EncryptMessage failed: %v", err)
	}

	// Attempt to decrypt with an invalid key
	_, err = DecryptMessage(encryptedMessage, invalidKey)
	if err == nil {
		t.Fatalf("DecryptMessage should have failed with an invalid key")
	}
}

// TestTamperedCiphertext tests decryption with a tampered ciphertext
func TestTamperedCiphertext(t *testing.T) {
	secretKey := []byte("examplekey123456") // Secret key (16 bytes)
	msg := SignedMessage{Session: "fakeuuidv4", PlainText: "Test Content"}

	encryptedMessage, err := EncryptMessage(msg, secretKey)
	if err != nil {
		t.Fatalf("EncryptMessage failed: %v", err)
	}

	// Tamper with the ciphertext (change a byte)
	tamperedCiphertext := []byte(encryptedMessage)
	tamperedCiphertext[len(tamperedCiphertext)-1] ^= 1 // Flip the last byte

	// Attempt to decrypt the tampered ciphertext
	_, err = DecryptMessage(string(tamperedCiphertext), secretKey)
	if err == nil {
		t.Fatalf("DecryptMessage should have failed with tampered ciphertext")
	}
}

// TestEmptyMessage tests encryption and decryption of an empty SignedMessage struct
func TestEmptyMessage(t *testing.T) {
	secretKey := []byte("examplekey123456") // Secret key (16 bytes)
	emptyMsg := SignedMessage{}

	encryptedMessage, err := EncryptMessage(emptyMsg, secretKey)
	if err != nil {
		t.Fatalf("EncryptMessage failed: %v", err)
	}

	decryptedMessage, err := DecryptMessage(encryptedMessage, secretKey)
	if err != nil {
		t.Fatalf("DecryptMessage failed: %v", err)
	}

	// Compare the decrypted message with the original empty message
	if decryptedMessage != emptyMsg {
		t.Fatalf("decrypted empty message does not match the original. Got %+v, expected %+v", decryptedMessage, emptyMsg)
	}
}

// TestInvalidKeyLength tests encryption with an invalid key length
func TestInvalidKeyLength(t *testing.T) {
	invalidKey := []byte("shortkey") // Invalid key length
	msg := SignedMessage{Session: "fakeuuidv4", PlainText: "Test Content"}

	_, err := EncryptMessage(msg, invalidKey)
	if err == nil {
		t.Fatalf("EncryptMessage should have failed with an invalid key length")
	}
}
