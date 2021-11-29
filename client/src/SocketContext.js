import React, { createContext, useState, useEffect, useRef} from "react";
import { io } from 'socket.io-client';
import Peer from "simple-peer";

const SocketContext = createContext();

//initial context of the socket.io
const socket = io('https://videoocall.herokuapp.com/');

const ContextProvider = ({ children }) => {
    const [ stream, setStream ] = useState(null);
    const [ me, setMe ] = useState('');
    const [ name, setName ] = useState('');
    const [ call, setCall ] = useState({});
    const [ callAccepted, setCallAccepted ] = useState(false);
    const [ callEnded, setCallEnded ] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
     
    useEffect(() => {
        //As soon the page loads, we'll get permission to use the camera and microphone
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(( currentStream ) => { 
            setStream(currentStream);

            myVideo.current.srcObject = currentStream;
        })
        
        socket.on('me', (id) => setMe(id));

        socket.on('calluser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivedCall: true, from, name: callerName, signal})
        })
    }, [])

    //These functions below are the actions we need to run the video chat
    const answerCall = () => {
        setCallAccepted(true)

        const peer = new Peer({ initiator: false, trickle: false, stream});

        peer.on('signal', (data) => {
            socket.emit('answercall', { signal: data, to: call.from});
        })

        //Stream for the other user
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        })

        peer.signal(call.signal);

        connectionRef.current = peer;
    }

    const callUser = (id) => {
        const peer = new Peer({ initiator: true, trickle: false, stream});

        peer.on('signal', (data) => {
            socket.emit('calluser', { userToCall: id, signalData: data, from: me, name});
        })

        //Stream for the other user
        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        })

        socket.on('callaccepted', (signal) => {
            setCallAccepted(true);

            peer.signal(signal);
        })

        connectionRef.current = peer;
    }

    const leaveCall = () => {
        setCallEnded(true);

        connectionRef.current.destroy();

        window.location.reload();
    }

    return (
        <SocketContext.Provider value={{ call, callAccepted, myVideo, userVideo, stream, name, setName, callEnded, me, callUser, leaveCall, answerCall }}>
            {children}
        </SocketContext.Provider>
    )
}

export { ContextProvider, SocketContext }