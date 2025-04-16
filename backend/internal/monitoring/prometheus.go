package monitoring

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const (
	MetricsNamespace = "morsechat"
)

type Metrics struct {
	ConnectedUsers       *prometheus.GaugeVec
	ConnectedShadowUsers prometheus.Gauge
	ConnectionDenied     *prometheus.CounterVec
	ConnectionDeniedIP   prometheus.Counter
	// report *prometheus.Counter
	// login *prometheus.Counter
	// register *prometheus.Counter
	BadMessages prometheus.Counter
	Messages    prometheus.Counter
	MessagesWpm prometheus.Histogram
}

func NewMetrics(registerer prometheus.Registerer) *Metrics {
	r := promauto.With(registerer)

	return &Metrics{
		ConnectedUsers: r.NewGaugeVec(prometheus.GaugeOpts{
			Namespace: MetricsNamespace,
			Name:      "connected_users",
			Help:      "total connected users",
		}, []string{
			"channel",
		}),
		//deprecated, todo: remove
		ConnectedShadowUsers: r.NewGauge(prometheus.GaugeOpts{
			Namespace: MetricsNamespace,
			Name:      "connected_shadow_users",
			Help:      "Total connected users that are shadow banned",
		}),
		ConnectionDenied: r.NewCounterVec(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "connection_denied",
			Help:      "number of connections to channels that have been denied",
		}, []string{
			"reason",
		}),
		BadMessages: r.NewCounter(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "bad_messages",
			Help:      "number of bad messages sent",
		}),
		Messages: r.NewCounter(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "messages",
			Help:      "number of messages sent",
		}),
		MessagesWpm: r.NewHistogram(prometheus.HistogramOpts{
			Namespace: MetricsNamespace,
			Name:      "messages_wpm",
			Help:      "distribution of the wpm of all messages sent",
			Buckets:   []float64{5.0, 10.0, 20.0, 30.0, 40.0, 50.0, 100.0},
		}),
	}
}
