// Simple stub for security filter
async function filterSafeTokens(tokens) {
  // For now, just return all tokens
  // You can add security checks here later
  return tokens;
}

module.exports = {
  filterSafeTokens
};
