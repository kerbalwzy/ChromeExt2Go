package chromeext2go

import (
	"crypto/md5"
	"sync"
	"time"
)

type ChromeExtClient struct {
	Sid            string    `json:"sid"`
	UniqueId       string    `json:"unique_id"`
	TypeName       string    `json:"type_name"`
	NickName       string    `json:"nick_name"`
	Ips            []string  `json:"ips"`
	LastRegisterAt time.Time `json:"last_register_at"`
	NetDelay       int64     `json:"net_delay"`
	tabs           sync.Map
}

func (client *ChromeExtClient) IpsHash() string {
	value := make([]byte, 0)
	hash := md5.New()
	for _, ip := range client.Ips {
		value = append(value, []byte(ip)...)
	}
	return string(hash.Sum(value))
}

func (client *ChromeExtClient) FlushLastRegisterAt() {
	client.LastRegisterAt = time.Now()
}
