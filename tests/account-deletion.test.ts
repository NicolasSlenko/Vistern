import assert from "node:assert/strict"
import { test } from "node:test"
import { ACCOUNT_DATA_TABLES, deleteAccountData, type AccountDataTable, type AccountDeletionServices } from "../src/lib/account-deletion"

function mockServices() {
  const target = "user_mock_delete"
  const other = "user_other"
  const identities = new Set([target, other])
  const objects = new Set([
    ...Array.from({ length: 1205 }, (_, index) => `uploads/${target}/file-${index}`),
    `uploads/${other}/resume.pdf`,
  ])
  const rows = new Map<AccountDataTable, Set<string>>(
    ACCOUNT_DATA_TABLES.map((table) => [table, new Set([target, other])]),
  )
  const services: AccountDeletionServices = {
    listObjects: async (prefix) => [...objects].filter((key) => key.startsWith(prefix)),
    deleteObjects: async (keys) => { for (const key of keys) objects.delete(key) },
    deleteRows: async (table, userId) => { rows.get(table)?.delete(userId) },
    countRows: async (table, userId) => Number(rows.get(table)?.has(userId)),
    deleteIdentity: async (userId) => { identities.delete(userId) },
  }
  return { target, other, identities, objects, rows, services }
}

test("deletes a disposable account across every data table, its files, and its identity", async () => {
  const mock = mockServices()
  await deleteAccountData(mock.target, mock.services)
  assert.equal(mock.identities.has(mock.target), false)
  assert.equal(mock.identities.has(mock.other), true)
  assert.equal([...mock.objects].filter((key) => key.startsWith(`uploads/${mock.target}/`)).length, 0)
  assert.equal(mock.objects.has(`uploads/${mock.other}/resume.pdf`), true)
  for (const table of ACCOUNT_DATA_TABLES) {
    assert.equal(mock.rows.get(table)?.has(mock.target), false, table)
    assert.equal(mock.rows.get(table)?.has(mock.other), true, table)
  }
})

test("retains the identity for retry when file removal fails", async () => {
  const mock = mockServices()
  mock.services.deleteObjects = async () => { throw new Error("storage unavailable") }
  await assert.rejects(deleteAccountData(mock.target, mock.services), /storage unavailable/)
  assert.equal(mock.identities.has(mock.target), true)
})

test("retains the identity for retry when a database row remains", async () => {
  const mock = mockServices()
  mock.services.deleteRows = async (table, userId) => {
    if (table !== "saved_jobs") mock.rows.get(table)?.delete(userId)
  }
  await assert.rejects(deleteAccountData(mock.target, mock.services), /account data remains/)
  assert.equal(mock.identities.has(mock.target), true)
})
