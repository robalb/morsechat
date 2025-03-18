package monitoring

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const (
  MetricsNamespace = "morsechat"
)

type Metrics struct{
  ConnectedUsers *prometheus.GaugeVec
  ConnectedShadowUsers prometheus.Gauge
  // report *prometheus.Counter
  // login *prometheus.Counter
  // register *prometheus.Counter
  BadMessages prometheus.Counter
  Messages prometheus.Counter
  MessagesWpm prometheus.Histogram

}


func NewMetrics() *Metrics {
  return &Metrics{
    ConnectedUsers: promauto.NewGaugeVec(prometheus.GaugeOpts{
      Namespace: MetricsNamespace,
      Name: "connected_users",
      Help: "total connected users",
    }, []string{
        "training",
        "ch1",
        "ch2",
        "ch3",
        "ch4",
        "ch5",
        "ch6",
        "pro1",
        "pro2",
        "pro3",
      }),
    ConnectedShadowUsers: promauto.NewGauge(prometheus.GaugeOpts{
      Namespace: MetricsNamespace,
      Name: "connected_shadow_users",
      Help: "Total connected users that are shadow banned",
    }),
    BadMessages: promauto.NewCounter(prometheus.CounterOpts{
      Namespace: MetricsNamespace,
      Name: "bad_messages",
      Help: "number of bad messages sent",
    }),
    Messages: promauto.NewCounter(prometheus.CounterOpts{
      Namespace: MetricsNamespace,
      Name: "messages",
      Help: "number of messages sent",
    }),
    MessagesWpm: promauto.NewHistogram(prometheus.HistogramOpts{
      Namespace: MetricsNamespace,
      Name: "messages_wpm",
      Help: "distribution of the wpm of all messages sent",
      Buckets: []float64{5.0, 10.0, 20.0, 30.0, 40.0, 50.0, 100.0},
    }),
  }
}
