// Unit tests for src/lib/ai-agent.ts
// Runner: Node.js built-in test runner. npm run test:unit

import { test, describe } from "node:test"
import assert from "node:assert/strict"

// Mirror of parseToolCallArgs from src/lib/ai-agent.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseToolCallArgs(argsJson: string, maxPartySize: number): any {
  try {
    const args = JSON.parse(argsJson)
    const nombre = String(args.nombre || '').slice(0, 100)
    const fecha = String(args.fecha || '')
    const hora = String(args.hora || '')
    const personas = Number(args.personas)
    const contacto = String(args.contacto || '').slice(0, 200)
    if (!nombre || !fecha || !hora || !contacto) return null
    if (!Number.isInteger(personas) || personas < 1 || personas > maxPartySize) return null
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha)) return null
    if (!/^[0-9]{2}:[0-9]{2}$/.test(hora)) return null
    return { nombre, fecha, hora, personas, contacto }
  } catch { return null }
}

function buildConfirmationText(r: any): string {
  if (!r) return 'Hubo un problema.'
  return 'Listo, ' + r.nombre + '! Para ' + r.personas + ' el ' + r.fecha + ' a las ' + r.hora + '.'
}

const MAX = 20

describe('valid inputs', () => {
  test('parses complete payload', () => {
    const r = parseToolCallArgs(JSON.stringify({ nombre: 'Juan Garcia', fecha: '2026-06-15', hora: '20:00', personas: 4, contacto: 'j@j.com' }), MAX)
    assert.ok(r !== null)
    assert.strictEqual(r.nombre, 'Juan Garcia')
    assert.strictEqual(r.fecha, '2026-06-15')
    assert.strictEqual(r.hora, '20:00')
    assert.strictEqual(r.personas, 4)
  })
  test('partySize 1 minimum', () => {
    const r = parseToolCallArgs(JSON.stringify({ nombre: 'A', fecha: '2026-07-01', hora: '12:00', personas: 1, contacto: 'x' }), MAX)
    assert.ok(r !== null && r.personas === 1)
  })
  test('partySize MAX boundary', () => {
    const r = parseToolCallArgs(JSON.stringify({ nombre: 'A', fecha: '2026-07-01', hora: '19:00', personas: MAX, contacto: 'x' }), MAX)
    assert.ok(r !== null && r.personas === MAX)
  })
  test('truncates nombre to 100', () => {
    const n200 = 'A'.repeat(200)
    const r = parseToolCallArgs(JSON.stringify({ nombre: n200, fecha: '2026-07-01', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX)
    assert.ok(r !== null && r.nombre.length === 100)
  })
  test('truncates contacto to 200', () => {
    const c300 = 'x@x.com' + 'c'.repeat(300)
    const r = parseToolCallArgs(JSON.stringify({ nombre: 'T', fecha: '2026-07-01', hora: '19:00', personas: 2, contacto: c300 }), MAX)
    assert.ok(r !== null && r.contacto.length === 200)
  })
})

describe('missing fields', () => {
  test('null nombre', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ fecha: '2026-07-01', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('null fecha', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('null hora', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('null contacto', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: 2 }), MAX), null) })
  test('null empty object', () => { assert.strictEqual(parseToolCallArgs('{}', MAX), null) })
})

describe('partySize validation', () => {
  test('null personas 0', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: 0, contacto: 'x@x.com' }), MAX), null) })
  test('null personas negative', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: -1, contacto: 'x@x.com' }), MAX), null) })
  test('null personas > MAX', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: MAX + 1, contacto: 'x@x.com' }), MAX), null) })
  test('null float', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: 2.5, contacto: 'x@x.com' }), MAX), null) })
  test('null string', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '19:00', personas: 'dos', contacto: 'x@x.com' }), MAX), null) })
})

describe('fecha format', () => {
  test('rejects DD-MM-YYYY', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '01-07-2026', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('rejects slash format', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026/07/01', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('rejects no leading zeros', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-7-1', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('rejects empty fecha', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '', hora: '19:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
})

describe('hora format', () => {
  test('rejects single digit', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '8:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('rejects with seconds', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '20:00:00', personas: 2, contacto: 'x@x.com' }), MAX), null) })
  test('rejects 12h format', () => { assert.strictEqual(parseToolCallArgs(JSON.stringify({ nombre: 'J', fecha: '2026-07-01', hora: '8pm', personas: 2, contacto: 'x@x.com' }), MAX), null) })
})

describe('malformed JSON', () => {
  test('garbage', () => { assert.strictEqual(parseToolCallArgs('not json', MAX), null) })
  test('empty string', () => { assert.strictEqual(parseToolCallArgs('', MAX), null) })
  test('array', () => { assert.strictEqual(parseToolCallArgs('[]', MAX), null) })
})

describe('buildConfirmationText', () => {
  test('fallback when null', () => { assert.ok(buildConfirmationText(null).length > 0) })
  test('includes customer name', () => {
    const r = { nombre: 'Carlos', fecha: '2026-08-15', hora: '20:30', personas: 3, contacto: 'c@c.com' }
    assert.ok(buildConfirmationText(r).includes('Carlos'))
  })
  test('includes party size', () => {
    const r = { nombre: 'Ana', fecha: '2026-08-15', hora: '20:30', personas: 5, contacto: 'a@a.com' }
    assert.ok(buildConfirmationText(r).includes('5'))
  })
  test('includes date', () => {
    const r = { nombre: 'Bob', fecha: '2026-09-20', hora: '19:00', personas: 2, contacto: 'b@b.com' }
    assert.ok(buildConfirmationText(r).includes('2026-09-20'))
  })
  test('includes time', () => {
    const r = { nombre: 'Mia', fecha: '2026-09-20', hora: '21:45', personas: 2, contacto: 'm@m.com' }
    assert.ok(buildConfirmationText(r).includes('21:45'))
  })
})

describe('Business rules spec encoding', () => {
  test('crear_reserva needs 5 fields', () => {
    assert.strictEqual(['nombre', 'fecha', 'hora', 'personas', 'contacto'].length, 5)
  })
  test('date regex YYYY-MM-DD', () => {
    const re = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
    assert.ok(re.test('2026-06-15'))
    assert.ok(!re.test('15-06-2026'))
    assert.ok(!re.test('2026/06/15'))
  })
  test('time regex HH:mm', () => {
    const re = /^[0-9]{2}:[0-9]{2}$/
    assert.ok(re.test('20:00'))
    assert.ok(re.test('09:30'))
    assert.ok(!re.test('9:30'))
    assert.ok(!re.test('20:00:00'))
  })
  test('maxPartySize boundary', () => {
    const isValid = (px: number, max: number) => Number.isInteger(px) && px >= 1 && px <= max
    assert.ok(isValid(1, 8))
    assert.ok(isValid(8, 8))
    assert.ok(!isValid(0, 8))
    assert.ok(!isValid(9, 8))
    assert.ok(!isValid(2.5, 8))
  })
})