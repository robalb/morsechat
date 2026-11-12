package monitoring

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const (
	MetricsNamespace = "morsechat"
)

type Metrics struct {
	ConnectedUsers    *prometheus.GaugeVec
	ConnectionDenied  *prometheus.CounterVec
	Logins            *prometheus.CounterVec
	Registrations     *prometheus.CounterVec
	Reports           prometheus.Counter
	BadMessages       prometheus.Counter
	ChamberedMessages prometheus.Counter
	Messages          prometheus.Counter
	MessagesWpm       prometheus.Histogram
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
		ConnectionDenied: r.NewCounterVec(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "connection_denied",
			Help:      "number of connections to channels that have been denied",
		}, []string{
			"reason",
		}),
		Logins: r.NewCounterVec(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "logins",
			Help:      "number of login attempts",
		}, []string{
			"result",
		}),
		Registrations: r.NewCounterVec(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "registrations",
			Help:      "number of registration attempts",
		}, []string{
			"result",
		}),
		Reports: r.NewCounter(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "reports",
			Help:      "number of messages reported by users",
		}),
		BadMessages: r.NewCounter(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "bad_messages",
			Help:      "number of bad messages sent",
		}),
		ChamberedMessages: r.NewCounter(prometheus.CounterOpts{
			Namespace: MetricsNamespace,
			Name:      "chambered_messages",
			Help:      "number of messages that were only broadcast to their own device cluster",
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
