// In production (single Railway service), the backend serves the frontend at the same origin,
// so use a relative base URL (""). Override with REACT_APP_API_URL for separate-service deploys.
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

export default API_URL;
