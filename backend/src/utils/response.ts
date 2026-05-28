export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    ...(message ? { message } : {}),
    data
  };
}

export function errorResponse(message: string, details?: unknown) {
  return {
    success: false,
    message,
    ...(details !== undefined ? { details } : {})
  };
}
