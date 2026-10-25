import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Increase JSON limit to handle base64 images for multimodal vision
app.use(express.json({ limit: '25mb' }));

// Shared server-side Google GenAI instance
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_SYSTEM_INSTRUCTION = `You are NOVA AI (නෝවා AI), a state-of-the-art futuristic AI assistant designed with a sleek cyber aesthetic for Android.
Core Persona and Capabilities:
- High intelligence, empathetic, polite, modern, and helpful.
- Fluent native-level bilingual capabilities in both Sinhala (සිංහල භාෂාව) and English.
- Sinhala Language Guidelines:
  * When spoken to in Sinhala, respond with natural, grammatically sound, conversational or formal Sinhala script (සිංහල). Avoid awkward machine translations; use authentic Sri Lankan phrasing and idioms where fitting.
  * When spoken to in Singlish (Sinhala written with Latin letters like 'kohomada', 'mata udawwak ona'), understand perfectly and reply either in authentic Sinhala script or friendly Singlish/English as most natural.
  * When spoken to in English, provide crisp, intelligent, world-class responses.
- Multimodal Vision:
  * When an image is provided, provide insightful, detailed, and context-aware visual analysis, recognizing objects, text in images (Sinhala or English), math equations, scenery, food, or screenshots.
- Creative Studio:
  * You excel at creative tasks: Sinhala songs (සරල ගී, බයිලා, පොප්), Sinhala rap (සිංහල රැප් පද, flow, rhymes, punchlines), imaginative stories (විද්‍යා ප්‍රබන්ධ, ජනකතා, අභිරහස්), and high-impact AI prompts.
- Formatting:
  * Use clean Markdown with headers, bold text, bullet points, and code blocks for readability on mobile screens.`;

/**
 * Fast and resilient AI generation with fallback models and hard timeout.
 * Uses gemini-flash-lite-latest for ultra-fast latency (~1s), with gemini-flash-latest and gemini-3.8-flash as resilient fallbacks.
 */
async function generateWithFallback(options: {
  contents: any;
  config?: any;
  timeoutMs?: number;
}): Promise<{ text: string; modelUsed: string }> {
  // Ordered from fastest/lowest latency to fallback
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash'];
  const timeoutMs = options.timeoutMs || 25000;

  let lastError: any = null;

  for (const model of models) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms waiting for model ${model}`)),
          timeoutMs
        )
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      const responseText = response?.text?.trim();

      if (responseText) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[NOVA AI] Model ${model} encountered an issue:`, err?.message || err);
      lastError = err;
      // Continue to next fallback model
    }
  }

  throw lastError || new Error('All AI models timed out or encountered an error.');
}

// Chat completion endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      systemInstruction,
      language = 'auto',
      temperature = 0.7,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check environment variables.',
      });
    }

    let dynamicSystemInstruction = systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
    if (language === 'si') {
      dynamicSystemInstruction += '\n[LANGUAGE PREFERENCE: Respond primarily in natural, clear Sinhala (සිංහල භාෂාවෙන් පිළිතුරු සපයන්න).]';
    } else if (language === 'en') {
      dynamicSystemInstruction += '\n[LANGUAGE PREFERENCE: Respond primarily in English.]';
    } else if (language === 'singlish') {
      dynamicSystemInstruction += '\n[LANGUAGE PREFERENCE: Understand Singlish and reply with friendly Sinhala script with English terms where appropriate.]';
    }

    // Format contents for Gemini SDK
    // Keep reasonable context window (last 10 messages) to avoid payload bloat and slow network transfers
    const contextMessages = messages.slice(-10);
    const contents = contextMessages.map((msg: any) => {
      const parts: any[] = [];

      // Check if this message has an attached image
      if (msg.image && msg.image.data) {
        let base64Data = msg.image.data;
        let mimeType = msg.image.mimeType || 'image/jpeg';
        if (base64Data.includes(';base64,')) {
          const split = base64Data.split(';base64,');
          mimeType = split[0].replace('data:', '') || mimeType;
          base64Data = split[1];
        }
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      return {
        role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const result = await generateWithFallback({
      contents,
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      },
      timeoutMs: 25000,
    });

    return res.json({ reply: result.text, model: result.modelUsed });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate AI response. Please try again.',
    });
  }
});

// Dedicated Creative Studio Generator endpoint (Songs, Sinhala Rap, Stories, Prompts)
app.post('/api/creative-tools', async (req: Request, res: Response) => {
  try {
    const { toolType, topic, genre, language = 'si', tone = 'energetic', extraNotes } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    let prompt = '';
    let toolSystemInstruction = DEFAULT_SYSTEM_INSTRUCTION;

    if (toolType === 'song') {
      prompt = `Write a complete, beautifully structured song about: "${topic || 'ආදරය සහ ජීවිතය'}".
Genre / Style: ${genre || 'Sinhala Sarala Gee (සරල ගී)'}
Tone / Mood: ${tone || 'Emotional & Melodic'}
Language format: ${language === 'si' ? 'Sinhala script (සිංහල පද)' : language === 'singlish' ? 'Singlish / Bilingual' : 'English'}
Additional guidelines: ${extraNotes || 'Include Intro, Verse 1, Chorus (ස්ථායි), Verse 2 (අන්තරා), Bridge, and Outro. Suggest chords and musical rhythm tempo (BPM).'}`;
    } else if (toolType === 'rap') {
      prompt = `Create an authentic, high-impact Sinhala Rap (සිංහල රැප්) track lyrics with raw rhyming flow and punchlines about: "${topic || 'ජීවිතයේ අරගලය සහ සිහින (Street Life & Hustle)'}".
Sub-genre: ${genre || 'Drill / Boom Bap / Sri Lankan Urban Rap'}
Flow / Delivery vibe: ${tone || 'Aggressive, rhythmic and passionate'}
Language: ${language === 'si' ? 'Authentic Sinhala with street poetry and metaphors' : 'Sinhala & English bilingual street mix'}
Additional guidelines: ${extraNotes || 'Provide Hook/Chorus (හූක්), Verse 1 (16 bars), Verse 2 (16 bars), Break, and Outro. Annotate rhyme schemes and rhythm accents (flow pattern).'}`;
    } else if (toolType === 'story') {
      prompt = `Write an engaging, immersive story about: "${topic || 'අනාගත කොළඹ නගරයේ අභිරහස (Future Colombo Mystery)'}".
Genre: ${genre || 'Sci-Fi / Cyberpunk / Folk Fantasy'}
Tone: ${tone || 'Thrilling & Atmospheric'}
Language: ${language === 'si' ? 'Sinhala language (සිංහලෙන්)' : 'English'}
Additional guidelines: ${extraNotes || 'Structure with an exciting hook, character introduction, rising climax, and a memorable twist or resolution.'}`;
    } else if (toolType === 'prompt') {
      prompt = `Act as an expert Prompt Engineer. Craft 3 high-performance, refined prompts based on the idea: "${topic || 'Futuristic Sri Lankan cybernetic warrior in neon Colombo 2099'}".
Category: ${genre || 'Image Generation (Midjourney/Flux/Imagen)'}
Target Tone: ${tone || 'Cinematic & Hyper-detailed'}
Format:
1. Master Prompt (Ready to copy-paste with aspect ratios, lighting, camera lens parameters)
2. Alternative Creative Variation
3. Negative Prompts / Parameters advice
Language explanation: ${language === 'si' ? 'Explain prompts in Sinhala with English prompt text' : 'English'}`;
    } else {
      prompt = topic;
    }

    const result = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction: toolSystemInstruction,
        temperature: 0.85,
      },
      timeoutMs: 25000,
    });

    return res.json({ result: result.text, model: result.modelUsed });
  } catch (err: any) {
    console.error('Error in /api/creative-tools:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate creative content.' });
  }
});

// App info endpoint
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NOVA AI',
    version: '2.5.0-android-edition',
    status: 'online',
    multimodal: true,
    languages: ['Sinhala (සිංහල)', 'English', 'Singlish'],
    secureIntegration: 'Server-side Gemini AI Logic with Android App Check compatibility',
  });
});

// One-click Project Source Code Export (.zip) for Android phone / user download
app.get('/api/export-project', async (_req: Request, res: Response) => {
  try {
    const zip = new JSZip();
    const rootDir = process.cwd();

    async function addDirectory(currentDir: string, zipFolder: JSZip) {
      const items = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);

        // Filter out unnecessary or bloated folders
        if (
          item.name === 'node_modules' ||
          item.name === '.git' ||
          item.name === 'dist' ||
          item.name === '.aistudio' ||
          item.name.endsWith('.log') ||
          item.name === '.DS_Store'
        ) {
          continue;
        }

        if (item.isDirectory()) {
          const sub = zipFolder.folder(item.name);
          if (sub) {
            await addDirectory(fullPath, sub);
          }
        } else {
          const data = await fs.promises.readFile(fullPath);
          zipFolder.file(item.name, data);
        }
      }
    }

    await addDirectory(rootDir, zip);
    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="nova-ai-project.zip"');
    return res.send(content);
  } catch (err: any) {
    console.error('Error generating export zip:', err);
    return res.status(500).json({ error: 'Failed to generate project source code zip.' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Vite middleware for fast HMR/dev
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static file serving in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NOVA AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
