/**
 * Calculate performance time in minutes
 * @param {Date | string} startTime
 * @param {Date | string} endTime
 * @returns {number} minutes
 */
exports.calculateMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const diffMs = end - start;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return diffMinutes > 0 ? diffMinutes : 0;
};
