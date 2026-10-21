import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', unreadOnly } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));

  const filter: Record<string, unknown> = { recipient: req.user!._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user!._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: { notifications, unreadCount, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user!._id },
    { isRead: true }
  );
  res.json({ success: true });
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.updateMany({ recipient: req.user!._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};
