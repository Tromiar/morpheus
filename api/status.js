export default async function handler(req, res) {
  const { id, dreamId } = req.query;
  if (!id) return res.status(400).json({ error: 'Нет ID задачи' });

  try {
    const polzaRes = await fetch(`https://polza.ai/api/v1/media/${id}`, {
      headers: { 'Authorization': `Bearer ${process.env.POLZA_API_KEY}` },
    });
    if (!polzaRes.ok) return res.status(500).json({ error: 'Ошибка проверки статуса' });
    const data = await polzaRes.json();

    if (data.status === 'failed') {
      return res.status(200).json({ status: 'failed', error: data.error || 'Генерация не удалась' });
    }
    if (data.status !== 'completed') {
      return res.status(200).json({ status: data.status });
    }

    const tempUrl = data.data?.url;
    if (!tempUrl) return res.status(500).json({ error: 'Нет ссылки на видео' });

    // Скачиваем видео с Polza
    const videoRes = await fetch(tempUrl);
    if (!videoRes.ok) return res.status(500).json({ error: 'Не удалось скачать видео' });
    const videoBuffer = await videoRes.arrayBuffer();
    const fileName = `dream-${dreamId || id}-${Date.now()}.mp4`;

    // Загружаем в Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/videos/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'video/mp4',
        'x-upsert': 'true',
      },
      body: videoBuffer,
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      console.error('Storage upload error:', uploadRes.status, t);
      return res.status(500).json({ error: 'Не удалось сохранить видео' });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${fileName}`;

    // Обновляем запись в базе
    if (dreamId) {
      await fetch(`${supabaseUrl}/rest/v1/dreams?id=eq.${dreamId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_url: publicUrl }),
      });
    }

    return res.status(200).json({ status: 'succeeded', videoUrl: publicUrl });
  } catch (e) {
    console.error('Status exception:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка' });
  }
}