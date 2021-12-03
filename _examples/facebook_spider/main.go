package main

import (
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
	chromeExt2Go "github.com/kerbalwzy/chrome-ext2go/module"
	"log"
	"net/http"
	"os"
	"time"
)

var allowOriginFunc = func(r *http.Request) bool {
	return true
}

func init() {
	log.SetOutput(os.Stdout)
}

func main() {
	manager := chromeExt2Go.NewManager(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: allowOriginFunc,
			},
			&websocket.Transport{
				CheckOrigin: allowOriginFunc,
			},
		},
	})
	go func() {
		if err := manager.SocketIoSrv.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()
	manager.SetPingInterval(time.Second * 10)
	manager.GetLogger().SetLevel(chromeExt2Go.Info)
	defer func() { _ = manager.SocketIoSrv.Close() }()
	http.Handle("/socket.io/", manager.SocketIoSrv)
	log.Println("Serving at: 0.0.0.0:54321")
	log.Fatal(http.ListenAndServe("0.0.0.0:54321", nil))
}
