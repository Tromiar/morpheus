// api/generate.js
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN, // Берётся из настроек Vercel
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText } = req.body;

  if (!dreamText || dreamText.trim().length < 5) {
    return res.status(400).json({ error: 'Текст сна слишком короткий' });
  }

  try {
    // Важно: используем create, а не run, чтобы не ждать завершения
    const prediction = await replicate.predictions.create({
      // Версия модели Stable Video Diffusion (текст-в-видео)
      // Версию лучше брать с сайта Replicate, она может обновляться
      version: "70343051073a378b2f2f6f7f3ae9c8102e9f24437ad8caa76ed47f697dd3420d", 
      input: {
        prompt: dreamText,
        // Параметры для короткого, атмосферного видео
        num_frames: 24,        // ~1 секунда при 24 fps, для начала хватит
        fps: 24,
        width: 1024,
        height: 576,           // Горизонтальный формат, как в ленте
        negative_prompt: "very blue, dust, noisy, washed out, ugly, distorted, broken",
      },
    });

    // Возвращаем ID сразу, не ждём результата
    return res.status(200).json({ 
      predictionId: prediction.id,
      status: prediction.status 
    });

  } catch (error) {
    console.error("Replicate create error:", error);
    return res.status(500).json({ error: 'Не удалось запустить генерацию' });
  }
}