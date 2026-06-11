import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import rateLimit from 'express-rate-limit'

const router = Router()

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI 请求过于频繁，请稍后再试' },
})

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

const PROMPTS = {
  continue: `你是一个专业的中文写作助手。请根据用户提供的文章内容，自然地续写下一段文字。
要求：
- 保持与原文一致的风格、语气和专业程度
- 续写内容要有实质性内容，不要空洞
- 直接输出续写文字，不要加任何前缀说明
- 字数控制在200-400字`,

  polish: `你是一个专业的中文写作润色助手。请优化用户选中的文字，使其表达更流畅、更有力。
要求：
- 保持原意不变
- 改进用词和句式，使其更简洁有力
- 直接输出润色后的文字，不要加任何说明
- 如果原文已经是好的表达，就保持原样`,

  outline: `你是一个专业的中文写作大纲助手。请根据用户提供的文章标题和主题，生成一份结构化的文章大纲。
要求：
- 包含3-6个主要章节
- 每个章节下列出2-3个要点
- 使用 Markdown 列表格式输出
- 大纲要有逻辑递进关系`,

  summary: `你是一个专业的摘要生成助手。请根据用户提供的文章内容，生成一段精炼的摘要。
要求：
- 字数控制在100-200字
- 抓住文章核心观点
- 直接输出摘要文字，不要加任何前缀说明`,

  free: `你是一个专业的博客写作助手。用户会描述想要写什么内容，请根据用户的描述直接生成文章内容。
要求：
- 直接输出生成的文章内容，不要加"好的"、"以下是"等前缀
- 内容要有实质性，结构清晰
- 保持自然流畅的中文写作风格
- 如果用户没有指定字数，默认写300-500字`,
}

async function streamAI(res, systemPrompt, userContent, model = 'deepseek-chat') {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      res.write(`data: ${JSON.stringify({ error: `AI 服务调用失败: ${response.status}` })}\n\n`)
      res.end()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n')
          res.end()
          return
        }
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            res.write(`data: ${JSON.stringify({ text: delta })}\n\n`)
          }
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI 服务连接失败' })}\n\n`)
    res.end()
  }
}

router.post('/generate', authRequired, aiLimiter, async (req, res) => {
  const { operation, content, context } = req.body

  if (!API_KEY) {
    return res.status(500).json({ message: 'AI 服务未配置' })
  }

  if (!operation || !PROMPTS[operation]) {
    return res.status(400).json({ message: '无效的操作类型' })
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: '请提供文章内容' })
  }

  const systemPrompt = PROMPTS[operation]

  let userContent = content
  if (operation === 'continue') {
    userContent = `以下是我的文章内容，请续写下一段：\n\n标题：${context?.title || '无标题'}\n\n正文：\n${content.slice(-2000)}\n\n请续写：`
  } else if (operation === 'polish') {
    userContent = `请润色以下文字：\n\n${content}`
  } else if (operation === 'outline') {
    userContent = `请为以下主题生成文章大纲：\n\n标题：${context?.title || '无标题'}\n主题分类：${context?.category || 'tech'}\n\n${content ? `当前内容概要：\n${content.slice(0, 500)}` : ''}`
  } else if (operation === 'summary') {
    userContent = `请为以下文章生成摘要：\n\n标题：${context?.title || '无标题'}\n\n正文：\n${content.slice(0, 3000)}`
  } else if (operation === 'free') {
    userContent = content
  }

  await streamAI(res, systemPrompt, userContent)
})

export default router
