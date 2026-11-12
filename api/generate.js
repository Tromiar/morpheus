export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { dreamText, userId } = req.body;
  if (!dreamText || dreamText.trim().length < 5) {
    return res.status(400).json({ error: 'Текст сна слишком короткий' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'Нет user_id' });
  }

  try {
    // 1. Создаём задачу в Polza
    const polzaRes = await fetch('https://polza.ai/api/v1/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'bytedance/seedance-2-mini',
        async: true,
        input: { prompt: dreamText, aspect_ratio: '16:9', resolution: '480p', duration: '5' },
      }),
    });
    if (!polzaRes.ok) {
      const t = await polzaRes.text();
      console.error('Polza create error:', polzaRes.status, t);
      return res.status(500).json({ error: 'Не удалось запустить генерацию' });
    }
    const polzaData = await polzaRes.json();
    const predictionId = polzaData.id;

    // 2. Сохраняем запись в Supabase (пока без видео)
    const mood = detectMood(dreamText);
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/dreams`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        text: dreamText.trim(),
        mood,
        video_url: null,
        prediction_id: predictionId,
      }),
    });
    if (!insertRes.ok) {
      const t = await insertRes.text();
      console.error('Supabase insert error:', insertRes.status, t);
      return res.status(500).json({ error: 'Не удалось сохранить сон' });
    }
    const inserted = await insertRes.json();
    const dreamId = inserted[0].id;

    return res.status(200).json({ predictionId, dreamId });
  } catch (e) {
    console.error('Generate exception:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка' });
  }
}

function detectMood(text) {
  const t = text.toLowerCase();
  if (/полет|лета|летел|летела|парю|крыл/.test(t)) return 'flight';
  if (/вод|мор|океан|река|озер|плав|тонул|плава/.test(t)) return 'water';
  if (/страх|тревог|кошмар|ужас|тьм|паден|погон/.test(t)) return 'dark';
  return 'neutral';
}