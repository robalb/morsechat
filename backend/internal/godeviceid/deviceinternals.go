package deviceid

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

var (
	filePath = "./filters/filter.csv"
)

func getOfflineID(d *DeviceData) string {
	//example online id:
	//a000f374-fc05-49a3-b13e-7508b94bf3e8
	//example Local/offline id:
	//L-127.0.0.1-11enus2w02_41a91f7b_75f1b356
	return fmt.Sprintf("L-%s-%s", d.Ipv4, d.HttpFinger)
}

func extractIP(s string) (string, bool) {
	if strings.HasPrefix(s, "L-") {
		parts := strings.SplitN(s, "-", 3)
		if len(parts) >= 2 {
			return parts[1], true
		}
	}
	return "", false // Not matching or malformed
}

// temporary patch, because winter is here
func tempIsBad(id string) bool {

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

func tempBan(id string) {
	// Append id into a new line of the file
	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		fmt.Println("failed to open filter file for writing")
		return
	}
	defer file.Close()

	// Avoid duplicate entries
	if tempIsBad(id) {
		fmt.Println("filter file: ID is already banned")
		return
	}

	_, err = file.WriteString(id + "\n")
	if err != nil {
		fmt.Println("failed to write to filter file")
	}
}

func tempUnBan(id string) {
	// Read all lines, skip the line containing the id, write back
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Println("failed to open filter file for reading")
		return
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.Contains(line, id) {
			lines = append(lines, line)
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Println("Error reading filter file")
		return
	}

	// Rewrite the file without the banned ID
	file, err = os.OpenFile(filePath, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0644)
	if err != nil {
		fmt.Println("failed to open filter file for writing")
		return
	}
	defer file.Close()

	writer := bufio.NewWriter(file)
	for _, line := range lines {
		_, err := writer.WriteString(line + "\n")
		if err != nil {
			fmt.Println("failed to write to filter file")
			return
		}
	}
	writer.Flush()
}
