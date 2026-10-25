import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import { webrtcService } from '../services/webrtcService';

export const getConsultationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const roomCode = String(req.params.roomCode);
  if (!roomCode) throw new AppError('Room code is required.', 400);

  const messages = await prisma.consultationMessage.findMany({
    where: { roomCode },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const formatted = messages.map((m) => ({
    id: m.id,
    sender: m.senderName,
    role: m.senderRole,
    text: m.text,
    timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: m.createdAt,
  }));

  res.json({
    success: true,
    data: { messages: formatted },
  });
};

export const postConsultationMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const roomCode = String(req.params.roomCode);
  const { text } = req.body;

  if (!roomCode) throw new AppError('Room code is required.', 400);
  if (!text || !text.trim()) throw new AppError('Message text cannot be empty.', 400);

  const user = req.user!;
  const saved = await prisma.consultationMessage.create({
    data: {
      roomCode,
      senderId: user.id,
      senderName: user.name || 'Healthcare Participant',
      senderRole: user.role || 'PATIENT',
      text: text.trim(),
    },
  });

  const messagePayload = {
    id: saved.id,
    sender: saved.senderName,
    role: saved.senderRole,
    text: saved.text,
    timestamp: new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: saved.createdAt,
  };

  // Broadcast to WebRTC socket room if initialized
  webrtcService.broadcastToRoom(roomCode, 'consultation-chat-message', messagePayload);

  res.status(201).json({
    success: true,
    data: { message: messagePayload },
  });
};
