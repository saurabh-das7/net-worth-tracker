// Shared date validation for any manual date entry (transactions, asset values,
// balance snapshots). Rejects garbage dates instead of silently accepting them.

const FLOOR_DATE = '2010-01-01' // nothing in this portfolio predates this

export function validateDate(dateStr) {
  if (!dateStr) return 'Date is required.'
  const today = new Date().toISOString().slice(0, 10)
  if (dateStr > today) return 'Date cannot be in the future.'
  if (dateStr < FLOOR_DATE) return `Date cannot be before ${FLOOR_DATE}.`
  return null
}
