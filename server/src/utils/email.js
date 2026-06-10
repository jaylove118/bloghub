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

export function sendVerificationCode(email, code) {
  return sendEmail({
    to: email,
    subject: 'BlogHub 邮箱验证码',
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px 40px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">BlogHub</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px">邮箱验证码</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">你正在注册 BlogHub 账户，请使用以下验证码完成邮箱验证：</p>
        <!-- Code box -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="background:#f0f5ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px">
            <span style="font-family:'SF Mono','Cascadia Code',Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#3b82f6">${code}</span>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
          验证码 <strong>10 分钟内</strong>有效，请勿转发给他人。<br>
          如果这不是你的操作，请忽略此邮件。
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
        <p style="margin:0;color:#9ca3af;font-size:12px">BlogHub — 分享你的想法</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  })
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
