// Unit tests for src/lib/schemas.ts
// Runner: Node.js built-in test runner. npm run test:unit

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { reservationCreateSchema, registerSchema, billingSchema, restaurantSettingsSchema, waitlistCreateSchema, parseBody } from '../lib/schemas.ts'

describe('parseBody helper', () => {
  const schema = z.object({ name: z.string().min(1), age: z.number() })
  test('returns success for valid input', () => {
    const r = parseBody(schema, { name: 'Juan', age: 30 })
    assert.strictEqual(r.success, true)
    if (r.success) assert.strictEqual(r.data.name, 'Juan')
  })
  test('returns error for invalid input', () => {
    const r = parseBody(schema, { name: '', age: 30 })
    assert.strictEqual(r.success, false)
    if (!r.success) assert.ok(r.error.length > 0)
  })
  test('returns error for missing fields', () => {
    const r = parseBody(schema, {})
    assert.strictEqual(r.success, false)
  })
})

describe('reservationCreateSchema', () => {
  const valid = { customerName: 'Juan', customerPhone: '+5491100000000', dateTime: new Date().toISOString(), partySize: 4 }
  test('accepts valid data', () => { assert.ok(reservationCreateSchema.safeParse(valid).success) })
  test('rejects empty customerName', () => { assert.ok(!reservationCreateSchema.safeParse({ ...valid, customerName: '' }).success) })
  test('rejects partySize 0', () => { assert.ok(!reservationCreateSchema.safeParse({ ...valid, partySize: 0 }).success) })
  test('rejects partySize negative', () => { assert.ok(!reservationCreateSchema.safeParse({ ...valid, partySize: -1 }).success) })
  test('coerces string partySize', () => {
    const r = reservationCreateSchema.safeParse({ ...valid, partySize: '4' })
    assert.ok(r.success)
    if (r.success) assert.strictEqual(r.data.partySize, 4)
  })
  test('rejects invalid email', () => { assert.ok(!reservationCreateSchema.safeParse({ ...valid, customerEmail: 'not-email' }).success) })
  test('accepts valid email', () => { assert.ok(reservationCreateSchema.safeParse({ ...valid, customerEmail: 'j@j.com' }).success) })
})

describe('registerSchema', () => {
  const valid = { restaurantName: 'Mi Restau', name: 'Juan', email: 'j@j.com', password: 'SecurePass1' }
  test('accepts valid registration', () => { assert.ok(registerSchema.safeParse(valid).success) })
  test('lowercases email', () => {
    const r = registerSchema.safeParse({ ...valid, email: 'JUAN@EXAMPLE.COM' })
    assert.ok(r.success)
    if (r.success) assert.strictEqual(r.data.email, 'juan@example.com')
  })
  test('rejects invalid email', () => { assert.ok(!registerSchema.safeParse({ ...valid, email: 'notvalid' }).success) })
  test('rejects short password', () => { assert.ok(!registerSchema.safeParse({ ...valid, password: 'short' }).success) })
  test('rejects long password', () => { assert.ok(!registerSchema.safeParse({ ...valid, password: 'A1'+'x'.repeat(130) }).success) })
})

describe('billingSchema', () => {
  test('accepts MONTHLY', () => { assert.ok(billingSchema.safeParse({ plan: 'MONTHLY' }).success) })
  test('accepts YEARLY', () => { assert.ok(billingSchema.safeParse({ plan: 'YEARLY' }).success) })
  test('rejects unknown plan', () => { assert.ok(!billingSchema.safeParse({ plan: 'WEEKLY' }).success) })
  test('rejects missing plan', () => { assert.ok(!billingSchema.safeParse({}).success) })
})

describe('restaurantSettingsSchema', () => {
  const valid = { name: 'Mi Restau', maxCapacity: 50, maxPartySize: 10 }
  test('accepts valid settings', () => { assert.ok(restaurantSettingsSchema.safeParse(valid).success) })
  test('rejects maxCapacity 0', () => { assert.ok(!restaurantSettingsSchema.safeParse({ ...valid, maxCapacity: 0 }).success) })
  test('rejects maxPartySize 0', () => { assert.ok(!restaurantSettingsSchema.safeParse({ ...valid, maxPartySize: 0 }).success) })
  test('trims restaurant name', () => {
    const r = restaurantSettingsSchema.safeParse({ ...valid, name: '  Mi Restau  ' })
    assert.ok(r.success)
    if (r.success) assert.strictEqual(r.data.name, 'Mi Restau')
  })
})

describe('waitlistCreateSchema', () => {
  const valid = { restaurantId: 'some-id', customerName: 'Juan', customerPhone: '+54911', dateTime: new Date().toISOString(), partySize: 3 }
  test('accepts valid entry', () => { assert.ok(waitlistCreateSchema.safeParse(valid).success) })
  test('rejects missing restaurantId', () => { assert.ok(!waitlistCreateSchema.safeParse({ ...valid, restaurantId: '' }).success) })
  test('rejects invalid email', () => { assert.ok(!waitlistCreateSchema.safeParse({ ...valid, customerEmail: 'bad-email' }).success) })
  test('accepts valid optional email', () => { assert.ok(waitlistCreateSchema.safeParse({ ...valid, customerEmail: 'j@j.com' }).success) })
})