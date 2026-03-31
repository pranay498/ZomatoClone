import morgan from "morgan";

// Custom morgan format string 
// Includes method, url, status, response time, and user ID if available
const customFormat = ':method :url :status :res[content-length] - :response-time ms - User: :user-id';

// Define a custom token for Morgan to log the user ID if present
morgan.token('user-id', (req: any) => {
  return req.user ? req.user.id || req.user.userId : 'Anonymous';
});

export const loggerMiddleware = morgan(customFormat);
