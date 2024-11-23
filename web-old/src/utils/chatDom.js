    /**
     * scroll to the bottom of the chat, but only if the user is not
     * reading old messages
     */
    export function scrollDown(chatDomNode){
        let chat = chatDomNode.current
        let margin = 60 //arbitrary value
        let scrollDown = (chat.scrollTop > (chat.scrollHeight - chat.clientHeight - margin));
        if(scrollDown){
            chat.scrollTop = chat.scrollHeight
        }
    }

  export function systemMessage(chatDomNode, msg){
        let chat = chatDomNode.current
        let message = document.createElement("p")
        message.innerText = msg
        chat.insertAdjacentElement("beforeend", message)
        //scroll down if the user is not reading old messages
        scrollDown(chatDomNode)
    }
