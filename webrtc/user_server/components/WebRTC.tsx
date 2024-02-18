import React, { useState, useCallback, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';


export const WebSocketDemo = ({currentPerson, setCurrentPerson}) => {
  //Public API that will echo messages sent to it back to the client
  const [socketUrl, setSocketUrl] = useState('ws://localhost:8080');
  const [messageHistory, setMessageHistory] = useState([]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  useEffect(() => {
    if (lastMessage !== null) {
      console.log('message received:', lastMessage , 'From', currentPerson)
      if (currentPerson === '') {
        setCurrentPerson('Bob')
      }
      // keep alice as alice and bob as bob
      setMessageHistory((prev) => prev.concat(lastMessage));
    }
  }, [lastMessage, setMessageHistory]);

  const handleClickChangeSocketUrl = useCallback(
    () => setSocketUrl('ws://localhost:8080'),
    []
  );


  function blobToText(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }

  const [textMessages, setTextMessages] = useState([])
  useEffect(() => {
    // Your asynchronous operations to convert Blobs to text
    const convertBlobsToText = async () => {
      const textMessages = await Promise.all(messageHistory.map(async (message, idx) => {
        if (message) {
          return await blobToText(message.data);
        }
        return null;
      }));
      setTextMessages(textMessages)
      return textMessages
    };

    convertBlobsToText()

    
  }, [messageHistory]);


  const handleClickSendMessage = useCallback(() => {
    // Set default to 'Alice' if currentPerson is an empty string
    const personToSendMessage = currentPerson || 'Alice';
    sendMessage(`Hello ${personToSendMessage === 'Alice' ? 'Bob' : 'Alice'} from ${personToSendMessage}`);
  }, [currentPerson]);
  
  
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  return (
    <div>
    <button 
      onClick={handleClickChangeSocketUrl}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Click Me to change Socket Url
    </button>
    <button
      onClick={handleClickSendMessage}
      disabled={readyState !== ReadyState.OPEN}
      className={`bg-${readyState === ReadyState.OPEN ? 'green' : 'green'}-500 
                  ${readyState === ReadyState.OPEN ? 'hover:bg-green-700' : ''} 
                  text-white font-bold py-2 px-4 rounded`}
    >
      Click Me to send 'Hello'
    </button>
    <span>The WebSocket is currently {connectionStatus}</span>

    <ul>
      {textMessages.map((message, idx) => (
        <li key={idx} className="mb-2">{message ? message : null}</li>
      ))}
    </ul>
  </div>
  );
};