// api/status.js
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Не передан ID задачи' });
  }

  try {
    const response = await fetch(`https://polza.ai/api/v1/media/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.POLZA_API_KEY}`,
      },
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Ошибка проверки статуса' });
    }

    const data = await response.json();

    if (data.status === 'completed') {
      return res.status(200).json({
        status: 'succeeded',
        videoUrl: data.data?.url || null,
      });
    }

    if (data.status === 'failed') {
      return res.status(200).json({
        status: 'failed',
        error: data.error || 'Генерация не удалась',
      });
    }

    // pending или processing
    return res.status(200).json({ status: data.status });

  } catch (error) {
    console.error('Polza status exception:', error);
    return res.status(500).json({ error: 'Ошибка соединения с Polza' });
  }
}