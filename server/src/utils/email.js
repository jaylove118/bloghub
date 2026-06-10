import nodemailer from 'nodemailer'

const EMAIL_HEADER = `
<tr><td style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:28px 40px;text-align:center">
  <table cellpadding="0" cellspacing="0" align="center"><tr>
    <td style="background:rgba(255,255,255,.15);width:40px;height:40px;border-radius:10px;text-align:center;vertical-align:middle">
      <span style="color:#fff;font-size:22px;font-weight:700;line-height:40px">B</span>
    </td>
    <td style="width:12px"></td>
    <td><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">BlogHub</h1></td>
  </tr></table>
  <p style="margin:10px 0 0;color:rgba(255,255,255,.8);font-size:14px">{{subtitle}}</p>
</td></tr>`

const EMAIL_FOOTER = `
<tr><td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
  <p style="margin:0;color:#9ca3af;font-size:12px">BlogHub — 分享你的想法</p>
</td></tr>`

function getTransporter() {
  if (!process.env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) {
    throw new Error('SMTP未配置：缺少SMTP_HOST环境变量')
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@bloghub.com',
    to,
    subject,
    html,
  })
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
      ${EMAIL_HEADER.replace('{{subtitle}}', '邮箱验证码')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">你正在注册 BlogHub 账户，请使用以下验证码完成邮箱验证：</p>
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
      ${EMAIL_FOOTER}
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
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      ${EMAIL_HEADER.replace('{{subtitle}}', '邮箱验证')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">感谢注册 BlogHub！</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">点击下方按钮验证你的邮箱地址：</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${siteUrl}/api/auth/verify-email?token=${token}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:15px;font-weight:600">验证邮箱</a>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">如果按钮无法点击，请复制以下链接：<br>${siteUrl}/api/auth/verify-email?token=${token}</p>
      </td></tr>
      ${EMAIL_FOOTER}
    </table>
  </td></tr>
</table>
</body></html>`,
  })
}

export function sendPasswordResetEmail(email, token) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: '重置你的 BlogHub 密码',
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      ${EMAIL_HEADER.replace('{{subtitle}}', '密码重置')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">你请求了密码重置。点击下方按钮设置新密码：</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${siteUrl}/reset-password?token=${token}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:15px;font-weight:600">重置密码</a>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">此链接 <strong>1 小时内</strong>有效。<br>如果这不是你的操作，请忽略此邮件。</p>
      </td></tr>
      ${EMAIL_FOOTER}
    </table>
  </td></tr>
</table>
</body></html>`,
  })
}

export function sendSubscribeConfirmation(email) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: '订阅成功 - BlogHub 博客更新',
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      ${EMAIL_HEADER.replace('{{subtitle}}', '订阅成功')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">你已成功订阅 BlogHub 博客更新。每当有新文章发布时，我们会第一时间通知你。</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${siteUrl}/blogs" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:15px;font-weight:600">浏览文章</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
        <p style="margin:0 0 8px;color:#9ca3af;font-size:12px">不想再收到邮件？<a href="${siteUrl}" style="color:#3b82f6">取消订阅</a></p>
        <p style="margin:0;color:#9ca3af;font-size:12px">BlogHub — 分享你的想法</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  })
}

export function sendNewPostNotification(email, postTitle, postExcerpt, postSlug, authorName) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  const postUrl = `${siteUrl}/blog/${postSlug}`
  return sendEmail({
    to: email,
    subject: `BlogHub 新文章：${postTitle}`,
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      ${EMAIL_HEADER.replace('{{subtitle}}', '新文章通知')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">你订阅的 BlogHub 有新文章发布啦。</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:20px">
            <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b">${postTitle}</h2>
            <p style="margin:0 0 12px;font-size:14px;color:#64748b;line-height:1.6">${postExcerpt || '点击查看全文'}</p>
            <p style="margin:0;font-size:13px;color:#94a3b8">作者：${authorName}</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${postUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:15px;font-weight:600">阅读全文</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center">
        <p style="margin:0 0 8px;color:#9ca3af;font-size:12px">不想再收到此类邮件？<a href="${siteUrl}" style="color:#3b82f6">取消订阅</a></p>
        <p style="margin:0;color:#9ca3af;font-size:12px">BlogHub — 分享你的想法</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  })
}

export function sendCommentNotification(email, postTitle, commenterName) {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  return sendEmail({
    to: email,
    subject: `${commenterName} 评论了你的文章`,
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      ${EMAIL_HEADER.replace('{{subtitle}}', '评论通知')}
      <tr><td style="padding:40px">
        <p style="margin:0 0 8px;color:#4b5563;font-size:15px">你好，</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">${commenterName} 评论了你的文章《${postTitle}》。登录 BlogHub 查看详情。</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${siteUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 40px;border-radius:9999px;font-size:15px;font-weight:600">查看详情</a>
          </td></tr>
        </table>
      </td></tr>
      ${EMAIL_FOOTER}
    </table>
  </td></tr>
</table>
</body></html>`,
  })
}
