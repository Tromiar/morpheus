// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dreamText } = req.body;

  if (!dreamText || dreamText.trim().length < 5) {
    return res.status(400).json({ error: 'Текст сна слишком короткий' });
  }

  try {
    const response = await fetch('https://polza.ai/api/v1/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLZA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'bytedance/seedance-2-mini',
        async: true,
        input: {
          prompt: dreamText,
          aspect_ratio: '16:9',
          resolution: '480p',
          duration: '5',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Polza create error:', response.status, errorText);
      return res.status(500).json({ error: 'Не удалось запустить генерацию' });
    }

    const data = await response.json();
    return res.status(200).json({ 
      predictionId: data.id,
      status: data.status 
    });

  } catch (error) {
    console.error('Polza create exception:', error);
    return res.status(500).json({ error: 'Ошибка соединения с Polza' });
  }
}