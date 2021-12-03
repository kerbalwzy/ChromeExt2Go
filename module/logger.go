package module

/*
Author: WZY
Date: 2021/12/3
Description:
	默认的日志输出
*/

import (
	"fmt"
	"log"
	"os"
	"sync"
)

type Level int

const (
	Debug Level = iota
	Info
	Warn
	Error
)

type Logger interface {
	SetLevel(level Level)
	Level() Level
	Printf(format string, v ...interface{})
	Debug(msg ...interface{})
	Info(msg ...interface{})
	Warn(msg ...interface{})
	Error(msg ...interface{})
}

type XLogger struct {
	level Level
	log.Logger
}

func (obj *XLogger) SetLevel(level Level) {
	obj.level = level
}

func (obj *XLogger) Level() Level {
	if obj.level == 0 {
		obj.level = Debug
	}
	return obj.level
}

// Printf rewrite for correct 'calldepth' value
func (obj *XLogger) Printf(format string, v ...interface{}) {
	_ = obj.Output(3, fmt.Sprintf(format, v...))
}

func (obj *XLogger) Debug(msg ...interface{}) {
	if obj.level > Debug {
		return
	}
	obj.Printf("[DEBUG] %v", msg)
}

func (obj *XLogger) Info(msg ...interface{}) {
	if obj.level > Info {
		return
	}
	obj.Printf("[INFO] %v", msg)
}

func (obj *XLogger) Warn(msg ...interface{}) {
	if obj.level > Warn {
		return
	}
	obj.Printf("[WARN] %v", msg)
}

func (obj *XLogger) Error(msg ...interface{}) {
	if obj.level > Error {
		return
	}
	obj.Printf("[ERROR] %v", msg)
}

var logger *XLogger
var once sync.Once

func GetLogger() *XLogger {
	once.Do(func() {
		logger = &XLogger{}
		logger.SetOutput(os.Stdout)
		logger.SetFlags(log.Ldate | log.Lmicroseconds | log.Lshortfile)
	})
	return logger
}
