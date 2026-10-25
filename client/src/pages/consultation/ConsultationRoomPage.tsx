import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  FileText,
  MessageSquare,
  ShieldCheck,
  Copy,
  Check,
  X,
  AlertTriangle,
  Send,
  Sparkles,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
}

interface SharedReportData {
  id: string;
  testType: string;
  testDate: string;
  findings?: string;
  notes?: string;
  fileUrl?: string;
  ocrParsedData?: {
    parameters?: Array<{
      name: string;
      value: string | number;
      unit?: string;
      referenceRange?: string;
      isAbnormal?: boolean;
    }>;
    abnormalCount?: number;
  };
}

export const ConsultationRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Media streams & connection refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isRemoteDescriptionSet = useRef<boolean>(false);
  const animIntervalRef = useRef<any>(null);

  // States
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerInfo, setPeerInfo] = useState<{ name: string; role: string } | null>(null);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  // Shared reports & drawers
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<any[]>([]);
  const [activeSharedReport, setActiveSharedReport] = useState<SharedReportData | null>(null);

  // In-call chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  };

  // 1. Fetch available reports for sharing & chat history
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/reports');
        if (res.data?.success) {
          setAvailableReports(res.data.data.reports || []);
        }
      } catch {
        // Silently handle if reports cannot be fetched
      }
    };

    const fetchChatHistory = async () => {
      try {
        const res = await api.get(`/consultations/${roomCode}/messages`);
        if (res.data?.success && Array.isArray(res.data.data.messages)) {
          setMessages(res.data.data.messages);
          if (chatScrollRef.current) {
            setTimeout(() => {
              if (chatScrollRef.current) {
                chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
              }
            }, 100);
          }
        }
      } catch {
        // Silently handle if new room without history
      }
    };

    fetchReports();
    if (roomCode) fetchChatHistory();
  }, [roomCode]);

  // 2. Setup RTCPeerConnection helper
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          roomCode,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        if (event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          let currentStream = remoteVideoRef.current.srcObject as MediaStream;
          if (!currentStream) {
            currentStream = new MediaStream();
            remoteVideoRef.current.srcObject = currentStream;
          }
          currentStream.addTrack(event.track);
        }
        setPeerConnected(true);
        remoteVideoRef.current?.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setPeerConnected(true);
        remoteVideoRef.current?.play().catch(() => {});
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        setPeerConnected(false);
      }
    };

    // Add local tracks to peer connection
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch {
        // Transceivers optional
      }
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [roomCode]);

  // 3. Initialize Socket & Local Media
  useEffect(() => {
    let mounted = true;

    const initConsultation = async () => {
      // Step A: Attempt to acquire camera and microphone with robust fallback
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (primaryMediaErr) {
        console.warn('Initial video+audio getUserMedia failed (e.g. camera busy in other tab):', primaryMediaErr);
        try {
          // Attempt audio-only if physical webcam is locked by another window/tab
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr) {
          console.warn('Audio-only getUserMedia also failed:', audioErr);
        }

        // Generate synthetic canvas stream so WebRTC SDP negotiation still has a valid video track
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          
          const drawFrame = () => {
            if (!ctx) return;
            const now = new Date();
            // Background
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 640, 480);
            
            // Pulsing avatar circle
            const pulse = Math.sin(Date.now() / 250);
            const radius = 55 + pulse * 6;
            ctx.beginPath();
            ctx.arc(320, 180, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#0284c7';
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(320, 180, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();

            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(user?.name || 'In-Call Participant', 320, 280);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px sans-serif';
            ctx.fillText(`Active Simulated Video Feed • ${now.toLocaleTimeString()}`, 320, 315);
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText('(Physical webcam in use by other window)', 320, 340);
          };

          drawFrame();
          animIntervalRef.current = setInterval(drawFrame, 200);

          if ((canvas as any).captureStream) {
            const canvasStream = (canvas as any).captureStream(15) as MediaStream;
            const syntheticVideoTrack = canvasStream.getVideoTracks()[0];
            if (syntheticVideoTrack) {
              if (!stream) stream = new MediaStream();
              stream.addTrack(syntheticVideoTrack);
            }
          }
        } catch {
          // Canvas stream fallback optional
        }
      }

      if (!mounted) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      }

      // Step B: Initialize Socket.io connection (ALWAYS connects, regardless of camera status)
      try {
        const socket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        const emitJoin = () => {
          setIsConnected(true);
          socket.emit('join-consultation-room', {
            roomCode,
            userName: user?.name || 'Healthcare Participant',
            userRole: user?.role || 'PATIENT',
          });
        };

        if (socket.connected) {
          emitJoin();
        } else {
          socket.on('connect', emitJoin);
        }

        socket.on('room-joined', (data: { roomCode: string; existingParticipants: any[] }) => {
          if (data.existingParticipants && data.existingParticipants.length > 0) {
            const peer = data.existingParticipants[0];
            setPeerInfo({ name: peer.userName, role: peer.userRole });
            // Initiate WebRTC offer as the joining peer
            handleInitiateOffer();
          }
        });

        socket.on('user-connected', (data: { socketId: string; userName: string; userRole: string }) => {
          setPeerInfo({ name: data.userName, role: data.userRole });
        });

        socket.on('webrtc-offer', async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
          const pc = createPeerConnection();
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          isRemoteDescriptionSet.current = true;

          // Drain queued ICE candidates
          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift();
            if (cand && peerConnectionRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
              } catch {
                // ignore
              }
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc-answer', {
            answer,
            roomCode,
          });
        });

        socket.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit }) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
            isRemoteDescriptionSet.current = true;

            // Drain queued ICE candidates
            while (candidateQueue.current.length > 0) {
              const cand = candidateQueue.current.shift();
              if (cand && peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                } catch {
                  // ignore
                }
              }
            }
          }
        });

        socket.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
          if (data.candidate) {
            if (isRemoteDescriptionSet.current && peerConnectionRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(data.candidate)
                );
              } catch {
                // Candidate handled
              }
            } else {
              candidateQueue.current.push(data.candidate);
            }
          }
        });

        socket.on('report-shared-update', (data: { reportData: SharedReportData; sharedBy: string }) => {
          setActiveSharedReport(data.reportData);
        });

        socket.on('consultation-chat-message', (msg: ChatMessage) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (chatScrollRef.current) {
            setTimeout(() => {
              if (chatScrollRef.current) {
                chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
              }
            }, 50);
          }
        });

        socket.on('user-disconnected', () => {
          setPeerConnected(false);
          setPeerInfo(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });
      } catch (err) {
        console.error('Failed to initialize consultation media:', err);
      }
    };

    initConsultation();

    return () => {
      mounted = false;
      if (animIntervalRef.current) {
        clearInterval(animIntervalRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.emit('end-consultation', { roomCode });
        socketRef.current.disconnect();
      }
    };
  }, [roomCode, user, createPeerConnection]);

  // 4. Initiate WebRTC Offer
  const handleInitiateOffer = async () => {
    try {
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', {
          offer,
          roomCode,
        });
      }
    } catch (err) {
      console.error('Failed to initiate consultation offer:', err);
    }
  };

  // 5. Toggle Audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // 6. Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // 7. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert back to webcam
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch {
        // User cancelled display media picker
      }
    }
  };

  // 8. Share Medical Report
  const handleShareReport = (report: any) => {
    const reportData: SharedReportData = {
      id: report.id,
      testType: report.testType,
      testDate: report.testDate,
      findings: report.findings,
      notes: report.notes,
      fileUrl: report.fileUrl,
      ocrParsedData: report.ocrParsedData,
    };

    setActiveSharedReport(reportData);
    setIsReportDrawerOpen(false);

    if (socketRef.current) {
      socketRef.current.emit('share-medical-report', {
        roomCode,
        reportId: report.id,
        reportData,
      });
    }
  };

  // 9. Send Chat Message (Persisted & Real-Time)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');

    try {
      const res = await api.post(`/consultations/${roomCode}/messages`, { text });
      if (res.data?.success && res.data.data?.message) {
        const savedMsg = res.data.data.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMsg.id)) return prev;
          return [...prev, savedMsg];
        });
      }
    } catch {
      // Direct WebSocket fallback if offline
      if (socketRef.current) {
        const fallbackMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: user?.name || 'Healthcare Participant',
          role: user?.role || 'PATIENT',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        socketRef.current.emit('consultation-chat-message', {
          roomCode,
          message: fallbackMsg,
        });
      }
    }

    if (chatScrollRef.current) {
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // 10. End Consultation
  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.emit('end-consultation', { roomCode });
      socketRef.current.disconnect();
    }

    if (user?.role === 'DOCTOR') {
      navigate('/doctor/appointments');
    } else {
      navigate('/patient/appointments');
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedRoomCode(true);
    setTimeout(() => setCopiedRoomCode(false), 2500);
  };

  return (
    <div className="relative h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Professional Header */}
      <header className="h-14 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/40 text-blue-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Telemedicine Encrypted Stream
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Room Code: <strong className="text-slate-200">{roomCode}</strong>
          </span>
          <button
            onClick={copyRoomLink}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Copy consultation URL"
          >
            {copiedRoomCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {peerInfo ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                Connected with {peerInfo.role === 'DOCTOR' ? 'Dr. ' : ''}
                {peerInfo.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for participant to join...</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Split Layout: Video Streams + Synchronized Report / Chat Overlay */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Video Canvas Container */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950">
          {/* Main Remote Video or Waiting Slate */}
          <div className="relative w-full h-full max-h-[82vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                peerConnected ? 'block opacity-100' : 'hidden opacity-0'
              }`}
            />

            {!peerConnected && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-blue-900/30 border border-blue-700/50 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-900/20">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-1">
                  Secure Video Consultation Active
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Encrypted clinical WebRTC channel established. Share the room link with the patient or physician to initiate peer-to-peer audio-video stream.
                </p>
                <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700">
                  <code className="text-xs font-mono text-blue-300">{roomCode}</code>
                  <button
                    onClick={copyRoomLink}
                    className="ml-2 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    {copiedRoomCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Self Video PIP (Picture in Picture) */}
            <div className="absolute bottom-4 right-4 w-44 sm:w-56 aspect-video rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-2xl z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                  <VideoOff className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Camera Inactive</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-slate-300">
                You ({user?.role})
              </div>
            </div>
          </div>
        </div>

        {/* Live Shared Medical Report Overlay Panel */}
        {activeSharedReport && (
          <aside className="w-96 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col z-20 shadow-2xl transition-all">
            <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Shared Diagnostic Record
                </h4>
              </div>
              <button
                onClick={() => setActiveSharedReport(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-blue-400">
                  Diagnostic Evaluation
                </span>
                <h5 className="text-sm font-bold text-slate-100 mt-0.5">
                  {activeSharedReport.testType}
                </h5>
                <p className="text-xs text-slate-400 mt-1">
                  Recorded: {new Date(activeSharedReport.testDate).toLocaleDateString()}
                </p>
              </div>

              {activeSharedReport.findings && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <h6 className="text-xs font-semibold text-slate-300 mb-1">Clinical Findings</h6>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeSharedReport.findings}
                  </p>
                </div>
              )}

              {/* OCR Parsed Clinical Parameters */}
              {activeSharedReport.ocrParsedData?.parameters && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      OCR Extracted Biomarkers
                    </span>
                    {activeSharedReport.ocrParsedData.abnormalCount ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        {activeSharedReport.ocrParsedData.abnormalCount} Abnormal
                      </span>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-800/40 divide-y divide-slate-700/60">
                    {activeSharedReport.ocrParsedData.parameters.map((param, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-slate-200">{param.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Reference: {param.referenceRange || 'Standard Range'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-bold ${
                              param.isAbnormal ? 'text-amber-400' : 'text-slate-100'
                            }`}
                          >
                            {param.value} {param.unit}
                          </span>
                          {param.isAbnormal && (
                            <span className="block text-[9px] uppercase tracking-wider font-bold text-amber-400">
                              Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSharedReport.fileUrl && (
                <a
                  href={activeSharedReport.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all"
                >
                  Download Source Document
                </a>
              )}
            </div>
          </aside>
        )}

        {/* Live Consultation Chat Drawer */}
        {isChatOpen && (
          <aside className="w-80 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col z-20 shadow-2xl">
            <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Clinical Messaging
                </h4>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No consultation messages yet.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                      m.sender === user?.name
                        ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                        : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 mb-0.5 opacity-80">
                      <span>{m.sender}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-snug">{m.text}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type clinical note or message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <footer className="h-20 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md px-6 flex items-center justify-center gap-4 z-20 shrink-0">
        <button
          onClick={toggleAudio}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isAudioEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-600/90 hover:bg-rose-500 text-white'
          }`}
          title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isVideoEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-600/90 hover:bg-rose-500 text-white'
          }`}
          title={isVideoEnabled ? 'Disable Camera' : 'Enable Camera'}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isScreenSharing
              ? 'bg-blue-600 text-white shadow-blue-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <MonitorUp className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsReportDrawerOpen(true)}
          className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all shadow-md"
          title="Share Medical Report"
        >
          <FileText className="w-5 h-5 text-blue-400" />
        </button>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isChatOpen
              ? 'bg-blue-600 text-white shadow-blue-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title="Consultation Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={handleEndCall}
          className="px-6 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all ml-4"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Disconnect Consultation</span>
        </button>
      </footer>

      {/* Select Report to Share Modal */}
      {isReportDrawerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Select Medical Report to Share
                </h3>
              </div>
              <button
                onClick={() => setIsReportDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {availableReports.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No verified medical reports available to share.
                </div>
              ) : (
                availableReports.map((report) => (
                  <div
                    key={report.id || report._id}
                    onClick={() => handleShareReport(report)}
                    className="p-3.5 rounded-xl border border-slate-800 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{report.testType}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Date: {new Date(report.testDate).toLocaleDateString()}
                      </p>
                      {report.findings && (
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                          {report.findings}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                      Share <Sparkles className="w-3 h-3" />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
