var myExstensionId = chrome.runtime.id;

$("input[name=\"unique_id\"]").val(localStorage.getItem("ExtUniqueID") || "")
$("input[name=\"type_name\"]").val(localStorage.getItem("ExtTypeName") || "")
$("input[name=\"nick_name\"]").val(localStorage.getItem("ExtNickName") || "")


$("#submit").on("click", function () {
    let unique_id = $("input[name=\"unique_id\"]").val();
    let type_name = $("input[name=\"type_name\"]").val();
    let nick_name = $("input[name=\"nick_name\"]").val();
    if (!unique_id || !nick_name) {
        $("#err_msg").text("请完整填写唯一标识和昵称")
    } else {
        localStorage.setItem("ExtUniqueID", unique_id);
        localStorage.setItem("ExtTypeName", type_name);
        localStorage.setItem("ExtNickName", nick_name);
        chrome.runtime.sendMessage(
            chrome.runtime.id,
            {
                recipient: "background",
                cmd: "client_online",
            },
            function (resp) {

            }
        )
    }
})

// 监听来自插件其他组成部分的消息
chrome.runtime.onMessage.addListener(
    /* https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
     * Notice: 'message.recipient' is self-defined
     */
    function (message, sender, sendResponse) {
        if (sender.id === myExstensionId && message.recipient === 'options') {
            switch (message.cmd) {
                case "errmsg": // 错误提示
                    $("#err_msg").text(message.params.errmsg)
                    break;
                case "set_default":
                    $("input[name=\"type_name\"]").val(message.params.ExtTypeName);
                    $("input[name=\"nick_name\"]").val(message.params.ExtNickName);
                    break
            }
            sendResponse({})
        }
    }
);