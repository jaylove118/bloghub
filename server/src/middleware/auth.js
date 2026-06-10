import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '请先登录' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role || 'user';
    next();
  } catch {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}

export function adminRequired(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}
