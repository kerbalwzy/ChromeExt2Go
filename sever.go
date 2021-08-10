package chromeext2go

import (
	"fmt"
	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"log"
	"sync"
	"time"
)

var serverOnce sync.Once
var connLastPingAt = map[string]int64{}
var server *socketio.Server = nil

func ping(conn socketio.Conn) {
	defer func() {
		delete(connLastPingAt, conn.ID())
		log.Println("关闭心跳:", conn.ID())
	}()
	// 每五秒ping一次客户端
	for {
		conn.Emit("ping")
		connLastPingAt[conn.ID()] = time.Now().UnixNano()
		time.Sleep(time.Second * 5)
	}
}

func NewServer(opts *engineio.Options) *socketio.Server {
	serverOnce.Do(func() {
		server = socketio.NewServer(opts)
		server.OnConnect("/", func(conn socketio.Conn) error {
			log.Println("连接建立:", conn.ID())
			fmt.Println("xxxxxxxxx")
			go func() { ping(conn) }()
			return nil
		})
		server.OnDisconnect("/", func(conn socketio.Conn, s string) {
			log.Println("连接断开:", conn.ID(), s)
		})
		server.OnEvent("/", "pong", func(conn socketio.Conn) {
			netDelay := (time.Now().UnixNano() - connLastPingAt[conn.ID()]) * 1000
			log.Println(conn.ID(), "-网络延迟:", netDelay)

		})
	})

	return server
}
