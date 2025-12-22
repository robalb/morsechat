package deviceid

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/robalb/morsechat/internal/db"
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

// check if an ipv4 is banned (either because of direct ipv4 ban or username ban)
func tempIsBanned(ip string, config *Config) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesRead := db.New(config.dbReadPool)
	isBanned, err := queriesRead.DeviceId_isBanned(ctx, ip)
	if err != nil {
		if err != sql.ErrNoRows {
			config.logger.Printf("DeviceID: tempIsBanned query error: %v ", err)
		}
		return false
	}
	return isBanned == 1
}

// associate a username to an ip
func tempAssociate(id string, ip string, config *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesWrite := db.New(config.dbWritePool)
	_, err := queriesWrite.DeviceId_insertIdentity(ctx, db.DeviceId_insertIdentityParams{
		Username: id,
		Ipv4:     ip,
	})
	if err != nil && err != sql.ErrNoRows {
		config.logger.Printf("DeviceID: tempAssociate query error: %v ", err)
	}
}

// ban an ipv4
func tempBan(ip string, config *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesWrite := db.New(config.dbWritePool)
	_, err := queriesWrite.DeviceId_insertIp(ctx, db.DeviceId_insertIpParams{
		Ipv4:     ip,
		IsBanned: 1,
	})
	if err != nil && err != sql.ErrNoRows {
		config.logger.Printf("DeviceID: tempBan query error: %v ", err)
	}

}

// unbann an ipv4
func tempUnban(ip string, config *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesWrite := db.New(config.dbWritePool)
	_, err := queriesWrite.DeviceId_insertIp(ctx, db.DeviceId_insertIpParams{
		Ipv4:     ip,
		IsBanned: 0,
	})
	if err != nil && err != sql.ErrNoRows {
		config.logger.Printf("DeviceID: tempUnbann query error: %v ", err)
	}
}

// ban all the ips associated to a username
func tempBanIdentity(id string, config *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesWrite := db.New(config.dbWritePool)
	_, err := queriesWrite.DeviceId_banIdentity(ctx, id)
	if err != nil && err != sql.ErrNoRows {
		config.logger.Printf("DeviceID: tempBanIdentity query error: %v ", err)
	}
}

// unbann all the ips associated to a username
func tempUnbanIdentity(id string, config *Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	queriesWrite := db.New(config.dbWritePool)
	_, err := queriesWrite.DeviceId_unbanIdentity(ctx, id)
	if err != nil && err != sql.ErrNoRows {
		config.logger.Printf("DeviceID: tempBanIdentity query error: %v ", err)
	}
}
