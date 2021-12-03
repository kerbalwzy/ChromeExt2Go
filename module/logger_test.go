package module

import "testing"

/*
Author: WZY
Date: 2021/12/3
Description:

*/

func TestGetLogger(t *testing.T) {
	logger := GetLogger()
	logger.Debug("Test Debug output with default leve")
	logger.SetLevel(Info)
	logger.Debug("this line should not output")
	logger.Info("Test Info output with Info level")
}
