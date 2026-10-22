import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', unreadOnly } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const where: any = { recipientId: req.user!.id };
  if (unreadOnly === 'true') where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { recipientId: req.user!.id, isRead: false } }),
  ]);

  const formatted = notifications.map((n) => ({ ...n, _id: n.id }));

  res.json({
    success: true,
    data: {
      notifications: formatted,
      unreadCount,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  await prisma.notification.updateMany({
    where: { id, recipientId: req.user!.id },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true });
};
