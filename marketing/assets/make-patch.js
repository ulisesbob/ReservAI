const https = require('https');
const token = '1706fe8b-5755-4a32-941c-a3a07a2f8e28';
const scenarioId = 4477502;

const blueprint = {
  name: 'WhatsApp Bot Inmobiliario - Leads',
  flow: [
    {
      id: 1,
      module: 'gateway:CustomWebHook',
      version: 1,
      parameters: { hook: 1, maxResults: 1 },
      mapper: {},
      metadata: { designer: { x: 0, y: 0 } }
    },
    {
      id: 2,
      module: 'google-sheets:addRow',
      version: 2,
      parameters: { includeHeaders: 1 },
      mapper: {
        spreadsheetId: '',
        sheetId: '',
        values: {
          'Nombre': '{{1.nombre}}',
          'Telefono': '{{1.telefono}}',
          'Tipo de propiedad': '{{1.tipo_propiedad}}',
          'Zona': '{{1.zona}}',
          'Presupuesto': '{{1.presupuesto}}',
          'Credito hipotecario': '{{1.credito_hipotecario}}',
          'Quiere agendar llamada': '{{1.quiere_llamada}}',
          'Fecha y hora': '{{now}}'
        }
      },
      metadata: { designer: { x: 300, y: 0 } }
    },
    {
      id: 3,
      module: 'gmail:sendEmail',
      version: 1,
      parameters: {},
      mapper: {
        to: 'hernan@amigoiapp.com',
        subject: 'Nuevo lead: {{1.nombre}} - {{1.zona}}',
        html: true,
        content: '<h2>Nuevo Lead Inmobiliario</h2><p><b>Nombre:</b> {{1.nombre}}</p><p><b>Telefono:</b> {{1.telefono}}</p><p><b>Tipo:</b> {{1.tipo_propiedad}}</p><p><b>Zona:</b> {{1.zona}}</p><p><b>Presupuesto:</b> {{1.presupuesto}}</p><p><b>Credito:</b> {{1.credito_hipotecario}}</p><p><b>Quiere llamada:</b> {{1.quiere_llamada}}</p><p><b>Fecha:</b> {{now}}</p>'
      },
      metadata: { designer: { x: 600, y: 0 } }
    }
  ],
  metadata: {
    instant: true,
    version: 1,
    scenario: { roundtrips: 1, maxErrors: 3, autoCommit: true, sequential: false }
  }
};

const body = JSON.stringify({ blueprint: JSON.stringify(blueprint) });
const options = {
  hostname: 'us2.make.com',
  path: '/api/v2/scenarios/' + scenarioId,
  method: 'PATCH',
  headers: {
    'Authorization': 'Token ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log(data.substring(0, 400));
  });
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
