import nodemailer from 'nodemailer'

function getTransporter() {
  if (!process.env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) {
    return false
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@bloghub.com',
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    return false
  }
}

export function sendVerificationEmail(email, token) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: '验证你的 BlogHub 邮箱',
    html: `<p>感谢注册 BlogHub！</p><p>请点击以下链接验证邮箱：</p><p><a href="${siteUrl}/api/auth/verify-email?token=${token}">${siteUrl}/api/auth/verify-email?token=${token}</a></p>`,
  })
}

export function sendPasswordResetEmail(email, token) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: '重置你的 BlogHub 密码',
    html: `<p>你请求了密码重置。</p><p>请点击以下链接设置新密码：</p><p><a href="${siteUrl}/reset-password?token=${token}">${siteUrl}/reset-password?token=${token}</a></p><p>此链接1小时内有效。</p>`,
  })
}

export function sendCommentNotification(email, postTitle, commenterName) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: `${commenterName} 评论了你的文章`,
    html: `<p>${commenterName} 评论了你的文章《${postTitle}》。</p><p>登录 <a href="${siteUrl}">BlogHub</a> 查看详情。</p>`,
  })
}
