package main

import (
	"testing"
	"golang.org/x/tools/go/analysis/analysistest"
)

func TestRespondErrorReturnAnalyzer(t *testing.T) {
	testdata := analysistest.TestData()
	analysistest.Run(t, testdata, RespondErrorReturnAnalyzer, "a")
}
