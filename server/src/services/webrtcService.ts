import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';

export class WebRTCService {
  private io: SocketIOServer | null = null;

  init(httpServer: HttpServer, clientUrl: string) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: clientUrl,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`WebRTC Client connected: ${socket.id}`);

      // Join Consultation Room
      socket.on('join-consultation-room', ({ appointmentId, userId, userRole, userName }) => {
        socket.join(appointmentId);
        logger.info(`User ${userName} (${userRole}) joined consultation room ${appointmentId}`);

        // Notify other participant
        socket.to(appointmentId).emit('user-joined-room', {
          socketId: socket.id,
          userId,
          userRole,
          userName,
        });
      });

      // SDP Offer
      socket.on('webrtc-offer', ({ appointmentId, sdp }) => {
        socket.to(appointmentId).emit('webrtc-offer', {
          fromSocketId: socket.id,
          sdp,
        });
      });

      // SDP Answer
      socket.on('webrtc-answer', ({ appointmentId, sdp }) => {
        socket.to(appointmentId).emit('webrtc-answer', {
          fromSocketId: socket.id,
          sdp,
        });
      });

      // ICE Candidates
      socket.on('webrtc-ice-candidate', ({ appointmentId, candidate }) => {
        socket.to(appointmentId).emit('webrtc-ice-candidate', {
          candidate,
        });
      });

      // Live Medical Report Sharing inside consultation room
      socket.on('share-medical-report', ({ appointmentId, reportData }) => {
        logger.info(`Medical report shared inside consultation room ${appointmentId}`);
        this.io?.to(appointmentId).emit('medical-report-shared', reportData);
      });

      // Screen Share Toggle
      socket.on('screen-share-status', ({ appointmentId, isSharing, userName }) => {
        socket.to(appointmentId).emit('screen-share-status', { isSharing, userName });
      });

      // Consultation Message / Chat inside room
      socket.on('consultation-chat', ({ appointmentId, message, senderName, senderRole }) => {
        this.io?.to(appointmentId).emit('consultation-chat', {
          message,
          senderName,
          senderRole,
          timestamp: new Date().toISOString(),
        });
      });

      // Leave / End Consultation
      socket.on('end-consultation', ({ appointmentId }) => {
        this.io?.to(appointmentId).emit('consultation-ended');
      });

      socket.on('disconnect', () => {
        logger.info(`WebRTC Client disconnected: ${socket.id}`);
      });
    });

    logger.info('WebRTC Signaling Engine initialized.');
  }
}

export const webrtcService = new WebRTCService();
