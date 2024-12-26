package morse

import (
	"testing"
)

func TestSign(t *testing.T) {
	secret := "test-secret-key"
	message := "test-message"

	// Generate a signature
	signature := Sign(message, secret)

	// Ensure the signature is not empty
	if signature == "" {
		t.Error("Expected signature to be non-empty")
	}

	// Verify the signature is consistent
	expectedSignature := Sign(message, secret)
	if signature != expectedSignature {
		t.Errorf("Expected signature %s, but got %s", expectedSignature, signature)
	}
}

func TestVerify(t *testing.T) {
	secret := "test-secret-key"
	message := "test-message"

	// Generate a valid signature
	validSignature := Sign(message, secret)

	// Test valid signature
	err := Verify(message, secret, validSignature)
	if err != nil {
		t.Errorf("Expected verification to succeed, but got error: %v", err)
	}

	// Test invalid signature
	invalidSignature := "invalid-signature"
	err = Verify(message, secret, invalidSignature)
	if err == nil {
		t.Error("Expected verification to fail for invalid signature, but it succeeded")
	}

	// Test tampered message
	tamperedMessage := "tampered-message"
	err = Verify(tamperedMessage, secret, validSignature)
	if err == nil {
		t.Error("Expected verification to fail for tampered message, but it succeeded")
	}

	// Test tampered secret
	tamperedSecret := "tampered-secret-key"
	err = Verify(message, tamperedSecret, validSignature)
	if err == nil {
		t.Error("Expected verification to fail for tampered secret, but it succeeded")
	}
}
