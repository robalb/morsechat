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
