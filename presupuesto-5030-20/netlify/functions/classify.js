exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } 
  catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { text, apiKey } = body;
  if (!text || !apiKey) {
    return { statusCode: 400, body: 'Missing text or apiKey' };
  }

  const systemPrompt = `Sos un asistente de finanzas personales para Argentina. Analizás frases del usuario y devolvés JSON.

CONTEXTO NUMÉRICO IMPORTANTE:
- El reconocimiento de voz en Android usa coma como separador de miles: "50,000" = 50000, "1,500,000" = 1500000
- También puede venir con punto: "50.000" = 50000
- Palabras: "un millón y medio" = 1500000, "cincuenta mil" = 50000, "cien mil" = 100000
- El símbolo $ antes de un número es parte del monto, no ignorarlo

CATEGORÍAS (regla 50/30/20):
- income: salario, sueldo, cobros, honorarios, ingresos, "cobré", "me pagaron", "gané"
- nec (Necesidades 50%): alquiler, expensas, comida, supermercado, servicios básicos (luz/gas/agua/internet), salud, farmacia, medicamentos, transporte esencial, educación, obra social, ropa básica
- des (Deseos 30%): salidas, restaurantes, bares, alcohol, cervezas, delivery, entretenimiento, viajes de placer, hobbies, ropa de marca, suscripciones (netflix/spotify), caprichos, cosas no esenciales
- aho (Ahorro 20%): plazo fijo, inversiones, dólares, cripto, fondos, ahorro explícito, "guardé", "puse en"

Respondé ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{"type":"income|nec|des|aho|unknown","amount":número_entero_sin_separadores,"name":"Nombre 2-4 palabras capitalizado","reason":"una línea explicando la clasificación"}`;

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
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error?.message || 'API error' })
      };
    }

    const raw = data.content[0].text.trim().replace(/```json|```/g, '').trim();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: raw
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
