// api/status.js
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Не передан ID задачи' });
  }

  try {
    const prediction = await replicate.predictions.get(id);

    // Если готово — отдаём ссылку на видео
    if (prediction.status === 'succeeded') {
      return res.status(200).json({
        status: 'succeeded',
        videoUrl: prediction.output, // Обычно это прямая ссылка на .mp4
      });
    }

    // Если ошибка — сообщаем
    if (prediction.status === 'failed') {
      return res.status(200).json({
        status: 'failed',
        error: prediction.error || 'Генерация не удалась',
      });
    }

    // Иначе — всё ещё в процессе
    return res.status(200).json({ status: prediction.status });

  } catch (error) {
    console.error("Replicate status error:", error);
    return res.status(500).json({ error: 'Ошибка при проверке статуса' });
  }
}