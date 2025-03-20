package deviceid

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func getOfflineID(d *DeviceData) string{
  //example online id:
  //a000f374-fc05-49a3-b13e-7508b94bf3e8
  //example Local/offline id:
  //L-127.0.0.1-11enus2w02_41a91f7b_75f1b356
  return fmt.Sprintf("L-%s-%s", d.Ipv4, d.HttpFinger)
}

//temporary patch, because winter is here
func tempIsBad(id string) bool{
  filePath := "./filters/filter.csv"

  file, err := os.Open(filePath)
	if err != nil {
    fmt.Println("failed to open filter file")
    return false
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if len(line) > 4 && strings.Contains(id, line) {
			return true
		}
	}

	if err := scanner.Err(); err != nil {
    fmt.Println("Error reading filter file")
	}
  return false
}

