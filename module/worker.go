package module

import (
	"crypto/md5"
	"sync"
)

type Worker struct {
	ConnID      string   `json:"conn_id"`      // socketIo链接ID
	ExtensionId string   `json:"extension_id"` // 客户端的插件ID
	ID          string   `json:"id"`           // 自定义ID值
	Nickname    string   `json:"nickname"`     // 自定义昵称
	Ips         []string `json:"ips"`          // 客户端的IP地址列表(局域网与公网)
}

func (obj *Worker) IpsHash() string {
	value := make([]byte, 0)
	hash := md5.New()
	for _, ip := range obj.Ips {
		value = append(value, []byte(ip)...)
	}
	return string(hash.Sum(value))
}

type WorkerPool struct {
	connId2worker   map[string]*Worker
	uniqueId2worker map[string]*Worker
	mu              sync.RWMutex
}

func (obj *WorkerPool) Add(connId, extensionId, id, nickName string, ips []string) {
	obj.mu.Lock()
	defer obj.mu.Unlock()
	worker := &Worker{connId, extensionId, id, nickName, ips}
	obj.connId2worker[connId] = worker
	obj.uniqueId2worker[id] = worker
}

func (obj *WorkerPool) Del(connId string) {
	obj.mu.Lock()
	defer obj.mu.Unlock()
	worker, ok := obj.connId2worker[connId]
	if ok {
		delete(obj.connId2worker, connId)
		delete(obj.uniqueId2worker, worker.ID)
	}
}

func (obj *WorkerPool) Get(id string) (*Worker, bool) {
	obj.mu.RLock()
	defer obj.mu.RUnlock()
	worker, ok := obj.uniqueId2worker[id]
	return worker, ok
}

func (obj *WorkerPool) ListByNickname(nickname string) []*Worker {
	obj.mu.RLock()
	defer obj.mu.RUnlock()
	res := make([]*Worker, 0)
	for _, worker := range obj.connId2worker {
		if worker.Nickname == nickname {
			res = append(res, worker)
		}
	}
	return res
}
