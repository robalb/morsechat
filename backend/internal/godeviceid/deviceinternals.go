package deviceid

import (
	"fmt"
)

func getOfflineID(d *DeviceData) string{
  //example online id:
  //a000f374-fc05-49a3-b13e-7508b94bf3e8
  //example Local/offline id:
  //L-127.0.0.1-11enus2w02_41a91f7b_75f1b356
  return fmt.Sprintf("L-%s-%s", d.Ipv4, d.HttpFinger)
}

