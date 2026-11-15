package wsserver

// This file contains some test for the hub behaviour.
// The whole hub file can be tested independently from
// the servews functions, using a custom writepump and
// readpump which allows us to skip the whole WS layer

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/config"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/monitoring"
)

func TestJoinBroadcast(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	hub := New()
	logger := log.New(io.Discard, "", 0)
	metrics := monitoring.NewMetrics(prometheus.NewRegistry())
	go hub.Run(ctx, logger, &config.Config{}, nil, nil, metrics)

	clientA := &Client{
		hub:                  hub,
		send:                 make(chan []byte, 256),
		userInfo:             auth.JwtData{IsAnonymous: true, Callsign: "AA1AAA", Username: "userA"},
		deviceInfo:           &deviceid.DeviceData{Id: "deviceA", ClusterId: "clusterA", Ipv4: "1.1.1.1"},
		lastMessageTimestamp: time.Now(),
	}
	clientB := &Client{
		hub:                  hub,
		send:                 make(chan []byte, 256),
		userInfo:             auth.JwtData{IsAnonymous: true, Callsign: "BB2BBB", Username: "userB"},
		deviceInfo:           &deviceid.DeviceData{Id: "deviceB", ClusterId: "clusterB", Ipv4: "2.2.2.2"},
		lastMessageTimestamp: time.Now(),
	}

	hub.register <- clientA
	hub.register <- clientB

	hub.clientRequest <- ClientRequest{
		bytes:  []byte(`{"type":"join","body":{"name":"presence-ch1"}}`),
		client: clientA,
	}
	hub.clientRequest <- ClientRequest{
		bytes:  []byte(`{"type":"join","body":{"name":"presence-ch1"}}`),
		client: clientB,
	}

	var first MessageJoin
	select {
	case raw := <-clientA.send:
		if err := json.Unmarshal(raw, &first); err != nil {
			t.Fatalf("userA first message: invalid json: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("userA did not receive their own join message")
	}
	if first.Type != "join" || first.Newuser.Callsign != "AA1AAA" {
		t.Fatalf("userA first message: expected join of AA1AAA, got %+v", first)
	}

	var second MessageJoin
	select {
	case raw := <-clientA.send:
		if err := json.Unmarshal(raw, &second); err != nil {
			t.Fatalf("userA second message: invalid json: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("userA did not receive the join message of userB")
	}
	if second.Type != "join" {
		t.Fatalf("userA second message: expected type join, got %q", second.Type)
	}
	if second.Channel != "presence-ch1" {
		t.Fatalf("userA second message: expected channel presence-ch1, got %q", second.Channel)
	}
	if second.Newuser.Callsign != "BB2BBB" || second.Newuser.Username != "userB" {
		t.Fatalf("userA second message: expected newuser userB, got %+v", second.Newuser)
	}
	if len(second.Users) != 2 {
		t.Fatalf("userA second message: expected 2 users in the channel, got %+v", second.Users)
	}
}

func TestShadowMutedMorseBroadcast(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	hub := New()
	logger := log.New(io.Discard, "", 0)
	metrics := monitoring.NewMetrics(prometheus.NewRegistry())
	conf := &config.Config{SecretBytes: make([]byte, 32)}
	go hub.Run(ctx, logger, conf, nil, nil, metrics)

	clientA := &Client{
		hub:        hub,
		send:       make(chan []byte, 256),
		userInfo:   auth.JwtData{IsAnonymous: true, Callsign: "AA1AAA", Username: "userA"},
		deviceInfo: &deviceid.DeviceData{Id: "deviceA", ClusterId: "clusterA", Ipv4: "1.1.1.1"},
	}
	clientB := &Client{
		hub:        hub,
		send:       make(chan []byte, 256),
		userInfo:   auth.JwtData{IsAnonymous: true, Callsign: "BB2BBB", Username: "userB"},
		deviceInfo: &deviceid.DeviceData{Id: "deviceB", ClusterId: "clusterB", Ipv4: "2.2.2.2"},
	}

	helloCommand := []byte(`{"type":"message","body":{"dialect":"international","wpm":20,"frequency":600,` +
		`"message":[40,60,40,60,40,60,40,180,40,180,40,60,200,60,40,60,40,180,40,60,200,60,40,60,40,180,200,60,200,60,200]}}`)

	// two users join
	{
		hub.register <- clientA
		hub.register <- clientB
		hub.clientRequest <- ClientRequest{
			bytes:  []byte(`{"type":"join","body":{"name":"presence-ch1"}}`),
			client: clientA,
		}
		hub.clientRequest <- ClientRequest{
			bytes:  []byte(`{"type":"join","body":{"name":"presence-ch1"}}`),
			client: clientB,
		}
		for i := 0; i < 2; i++ {
			select {
			case <-clientA.send:
			case <-time.After(time.Second):
				t.Fatal("userA did not receive the join messages")
			}
		}
		select {
		case <-clientB.send:
		case <-time.After(time.Second):
			t.Fatal("userB did not receive the join message")
		}
	}

	// userA types "hello"
	{
		hub.clientRequest <- ClientRequest{bytes: helloCommand, client: clientA}
	}

	// both users receive the morse message
	{
		var gotA MessageMorse
		select {
		case raw := <-clientA.send:
			if err := json.Unmarshal(raw, &gotA); err != nil {
				t.Fatalf("userA morse message: invalid json: %v", err)
			}
		case <-time.After(time.Second):
			t.Fatal("userA did not receive the morse message")
		}
		if gotA.Type != "message" || gotA.Callsign != "AA1AAA" {
			t.Fatalf("userA morse message: expected a message from AA1AAA, got %+v", gotA)
		}

		var gotB MessageMorse
		select {
		case raw := <-clientB.send:
			if err := json.Unmarshal(raw, &gotB); err != nil {
				t.Fatalf("userB morse message: invalid json: %v", err)
			}
		case <-time.After(time.Second):
			t.Fatal("userB did not receive the morse message")
		}
		if gotB.Type != "message" || gotB.Callsign != "AA1AAA" {
			t.Fatalf("userB morse message: expected a message from AA1AAA, got %+v", gotB)
		}

		select {
		case <-clientA.send:
		case <-time.After(time.Second):
			t.Fatal("userA did not receive the message status")
		}
	}

	// userA gets muted
	{
		hub.SystemRequest <- SysMessageMute{Callsign: "AA1AAA", Mute: true}
	}

	// userA types "hello" again
	{
		clientA.lastMessageTimestamp = time.Time{}
		hub.clientRequest <- ClientRequest{bytes: helloCommand, client: clientA}
	}

	// only userA receives hello back
	{
		var gotA MessageMorse
		select {
		case raw := <-clientA.send:
			if err := json.Unmarshal(raw, &gotA); err != nil {
				t.Fatalf("userA muted morse message: invalid json: %v", err)
			}
		case <-time.After(time.Second):
			t.Fatal("userA did not receive their own muted morse message")
		}
		if gotA.Type != "message" || gotA.Callsign != "AA1AAA" {
			t.Fatalf("userA muted morse message: expected a message from AA1AAA, got %+v", gotA)
		}

		select {
		case <-clientA.send:
		case <-time.After(time.Second):
			t.Fatal("userA did not receive the message status")
		}

		select {
		case raw := <-clientB.send:
			t.Fatalf("userB received a message from a shadow muted user: %s", raw)
		case <-time.After(200 * time.Millisecond):
		}
	}
}
