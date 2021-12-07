package module

/*
Author: WZY
Date: 2021/12/3
Description:
	核心管理对象
*/

import (
	socketIo "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"sync"
	"time"
)

var managerOnce = new(sync.Once)
var manager *Manager

type Manager struct {
	SocketIoSrv    *socketIo.Server // socketIo服务端对象
	WorkerNetDelay map[string]int64 // 工作客户端的网络延迟, 毫秒级, 每5秒更新一次
	connLastPingAt map[string]int64 // 记录工作客户端的上次Ping时间, 用于计算网络延迟
	logger         Logger           // 日志输出对象
	pingInterval   time.Duration
}

func (obj *Manager) SetLogger(logger Logger) {
	obj.logger = logger
}

func (obj *Manager) GetLogger() Logger {
	return obj.logger
}

func (obj *Manager) SetPingInterval(interval time.Duration) {
	obj.pingInterval = interval
}

func NewManager(opts *engineio.Options) *Manager {
	managerOnce.Do(func() {
		server := socketIo.NewServer(opts)
		manager = &Manager{
			SocketIoSrv:    server,
			WorkerNetDelay: map[string]int64{},
			connLastPingAt: map[string]int64{},
			logger:         GetLogger(),
			pingInterval:   time.Second * 5,
		}
		ping := func(conn socketIo.Conn) {
			defer func() {
				delete(manager.connLastPingAt, conn.ID())
				manager.logger.Debug("Close ping: conn.ID =", conn.ID())
			}()
			for {
				if conn.Context().(string) == "disconnected" {
					break
				}
				time.Sleep(manager.pingInterval)
				conn.Emit("ping")
				now := time.Now()
				manager.connLastPingAt[conn.ID()] = now.UnixNano() / 1e6
				manager.logger.Debug("Ping: conn.ID =", conn.ID(), "At:", now)
			}
		}
		server.OnConnect("/", func(conn socketIo.Conn) error {
			conn.SetContext("connected")
			manager.logger.Info("New connect: conn.ID =", conn.ID())
			go ping(conn)
			return nil
		})
		server.OnDisconnect("/", func(conn socketIo.Conn, s string) {
			manager.logger.Info("Disconnect: conn.ID =", conn.ID())
			conn.SetContext("disconnected")
			_ = conn.Close()
		})
		server.OnEvent("/", "pong", func(conn socketIo.Conn) {
			now := time.Now()
			netDelay := now.UnixNano()/1e6 - manager.connLastPingAt[conn.ID()]
			manager.WorkerNetDelay[conn.ID()] = netDelay
			manager.logger.Debug("Pong: conn.ID =", conn.ID(), "At:", now, "Net Delay:", netDelay)
		})
	})
	return manager
}
