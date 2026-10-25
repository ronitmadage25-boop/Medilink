import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';

interface Participant {
  socketId: string;
  userId?: string;
  userName: string;
  userRole: string;
}

export class WebRTCService {
  private io: SocketIOServer | null = null;
  private roomParticipants = new Map<string, Map<string, Participant>>();

  init(httpServer: HttpServer, clientUrl: string) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (requestOrigin, callback) => {
          if (!requestOrigin) return callback(null, true);
          if (
            requestOrigin === clientUrl ||
            requestOrigin === 'http://localhost:5173' ||
            requestOrigin === 'http://127.0.0.1:5173' ||
            requestOrigin.endsWith('.vercel.app')
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`WebRTC Client connected: ${socket.id}`);
      let currentRoom: string | null = null;

      // Join Consultation Room
      socket.on('join-consultation-room', (payload: {
        roomCode?: string;
        appointmentId?: string;
        userId?: string;
        userRole?: string;
        userName?: string;
      }) => {
        const room = payload.roomCode || payload.appointmentId || 'default-room';
        const userName = payload.userName || 'Healthcare Member';
        const userRole = payload.userRole || 'PATIENT';
        const userId = payload.userId;

        currentRoom = room;
        socket.join(room);

        if (!this.roomParticipants.has(room)) {
          this.roomParticipants.set(room, new Map());
        }

        const roomMap = this.roomParticipants.get(room)!;
        const existingList = Array.from(roomMap.values());

        // Notify joining socket about existing peers
        socket.emit('room-joined', {
          roomCode: room,
          existingParticipants: existingList,
        });

        // Register participant
        const participant: Participant = {
          socketId: socket.id,
          userId,
          userName,
          userRole,
        };
        roomMap.set(socket.id, participant);

        logger.info(`User ${userName} (${userRole}) joined consultation room: ${room}`);

        // Broadcast to existing participants that a new peer connected
        socket.to(room).emit('user-connected', {
          socketId: socket.id,
          userId,
          userName,
          userRole,
        });

        socket.to(room).emit('user-joined-room', {
          socketId: socket.id,
          userId,
          userRole,
          userName,
        });
      });

      // SDP Offer
      socket.on('webrtc-offer', (data: {
        roomCode?: string;
        appointmentId?: string;
        offer?: any;
        sdp?: any;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;
        const offerPayload = data.offer || data.sdp;

        socket.to(room).emit('webrtc-offer', {
          offer: offerPayload,
          sdp: offerPayload,
          from: socket.id,
          fromSocketId: socket.id,
        });
      });

      // SDP Answer
      socket.on('webrtc-answer', (data: {
        roomCode?: string;
        appointmentId?: string;
        answer?: any;
        sdp?: any;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;
        const answerPayload = data.answer || data.sdp;

        socket.to(room).emit('webrtc-answer', {
          answer: answerPayload,
          sdp: answerPayload,
          from: socket.id,
          fromSocketId: socket.id,
        });
      });

      // ICE Candidates
      socket.on('webrtc-ice-candidate', (data: {
        roomCode?: string;
        appointmentId?: string;
        candidate: any;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;

        socket.to(room).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
        });
      });

      // Live Medical Report Sharing inside consultation room
      socket.on('share-medical-report', (data: {
        roomCode?: string;
        appointmentId?: string;
        reportData: any;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;

        logger.info(`Medical report shared inside consultation room: ${room}`);
        this.io?.to(room).emit('report-shared-update', {
          reportData: data.reportData,
          sharedBy: socket.id,
        });
        this.io?.to(room).emit('medical-report-shared', data.reportData);
      });

      // Screen Share Toggle
      socket.on('screen-share-status', (data: {
        roomCode?: string;
        appointmentId?: string;
        isSharing: boolean;
        userName?: string;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;

        socket.to(room).emit('screen-share-status', {
          isSharing: data.isSharing,
          userName: data.userName,
        });
      });

      // In-Call Chat Message (Saved to PostgreSQL and Broadcasted)
      socket.on('consultation-chat-message', async (data: {
        roomCode?: string;
        appointmentId?: string;
        message: any;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;

        const text = data.message?.text || (typeof data.message === 'string' ? data.message : '');
        if (!text || !text.trim()) return;

        try {
          const participant = currentRoom ? this.roomParticipants.get(currentRoom)?.get(socket.id) : null;
          const saved = await prisma.consultationMessage.create({
            data: {
              roomCode: room,
              senderId: participant?.userId || null,
              senderName: data.message?.sender || participant?.userName || 'Healthcare Participant',
              senderRole: data.message?.role || participant?.userRole || 'PATIENT',
              text: text.trim(),
            },
          });

          const msgPayload = {
            id: saved.id,
            sender: saved.senderName,
            role: saved.senderRole,
            text: saved.text,
            timestamp: new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: saved.createdAt,
          };

          this.io?.to(room).emit('consultation-chat-message', msgPayload);
        } catch (err) {
          logger.error('Failed to persist consultation chat message:', err);
          this.io?.to(room).emit('consultation-chat-message', data.message);
        }
      });

      socket.on('consultation-chat', async (data: {
        roomCode?: string;
        appointmentId?: string;
        message: string;
        senderName?: string;
        senderRole?: string;
      }) => {
        const room = data.roomCode || data.appointmentId || currentRoom;
        if (!room) return;

        try {
          const participant = currentRoom ? this.roomParticipants.get(currentRoom)?.get(socket.id) : null;
          const saved = await prisma.consultationMessage.create({
            data: {
              roomCode: room,
              senderId: participant?.userId || null,
              senderName: data.senderName || participant?.userName || 'Healthcare Participant',
              senderRole: data.senderRole || participant?.userRole || 'PATIENT',
              text: data.message.trim(),
            },
          });

          const chatPayload = {
            id: saved.id,
            sender: saved.senderName,
            role: saved.senderRole,
            text: saved.text,
            timestamp: new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: saved.createdAt,
          };

          this.io?.to(room).emit('consultation-chat-message', chatPayload);
          this.io?.to(room).emit('consultation-chat', chatPayload);
        } catch (err) {
          logger.error('Failed to persist consultation chat message:', err);
          const fallbackPayload = {
            id: `msg-${Date.now()}`,
            sender: data.senderName || 'Participant',
            role: data.senderRole || 'PATIENT',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          this.io?.to(room).emit('consultation-chat-message', fallbackPayload);
        }
      });

      // Leave / End Consultation
      const handleLeave = () => {
        if (!currentRoom) return;
        const room = currentRoom;
        const roomMap = this.roomParticipants.get(room);
        if (roomMap) {
          roomMap.delete(socket.id);
          if (roomMap.size === 0) {
            this.roomParticipants.delete(room);
          }
        }

        socket.to(room).emit('user-disconnected', { socketId: socket.id });
        socket.to(room).emit('consultation-ended');
        currentRoom = null;
      };

      socket.on('end-consultation', handleLeave);
      socket.on('disconnect', () => {
        handleLeave();
        logger.info(`WebRTC Client disconnected: ${socket.id}`);
      });
    });

    logger.info('WebRTC Signaling Engine initialized.');
  }

  broadcastToRoom(room: string, event: string, data: any) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }
}

export const webrtcService = new WebRTCService();
