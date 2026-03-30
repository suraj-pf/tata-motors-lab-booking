/**
 * Format a number as a percentage with one decimal place.
 * If the input is undefined or null, returns '0%'.
 */
export const formatUtilization = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

/**
 * Format a number as currency (INR).
 * Assumes the amount is in rupees.
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Format time for display
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const [hour, minute] = timeStr.split(':')
  const hour12 = parseInt(hour) % 12 || 12
  const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minute} ${ampm}`
}