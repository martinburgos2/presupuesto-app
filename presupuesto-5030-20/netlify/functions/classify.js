exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const rawBody = event.body || '';
  let text, apiKey;

  try {
    const parsed = JSON.parse(rawBody);
    text = parsed.text;
    apiKey = parsed.apiKey;
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido: ' + e.message }) };
  }

  if (!text) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta text' }) };
  if (!apiKey) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta apiKey' }) };

  const systemPrompt = `Sos un asistente de finanzas personales para Argentina. Analizás frases y devolvés JSON.

NÚMEROS: "50,000"=50000, "1,500,000"=1500000, "50.000"=50000, "un millón y medio"=1500000, "cincuenta mil"=50000, "veinte mil"=20000

CATEGORÍAS:
- income: salario, sueldo, cobros, honorarios, ingresos
- nec: alquiler, expensas, comida, supermercado, servicios, salud, farmacia, medicamentos, transporte, educación
- des: salidas, restaurantes, alcohol, cervezas, delivery, entretenimiento, viajes, hobbies, suscripciones, caprichos
- aho: plazo fijo, inversiones, dólares, cripto, ahorro

Respondé SOLO JSON sin markdown:
{"type":"income|nec|des|aho|unknown","amount":número_entero,"name":"Nombre 2-4 palabras","reason":"explicación"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'API error' }) };
    }

    const raw = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return { statusCode: 200, headers, body: raw };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
