package main

import (
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
	chromeext2go "github.com/kerbalwzy/chrome-ext2go"
	"log"
	"net/http"
	"os"
)

var allowOriginFunc = func(r *http.Request) bool {
	return true
}

func init() {
	log.SetOutput(os.Stdout)
}

func main() {
	server := chromeext2go.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: allowOriginFunc,
			},
			&websocket.Transport{
				CheckOrigin: allowOriginFunc,
			},
		},
	})
	http.Handle("/socket.io/", server)
	log.Println("Serving at :45321...")
	log.Fatal(http.ListenAndServe("0.0.0.0:45321", nil))
}
