type ApiError = {
  message: string;
  statusCode: number;
  timestamp: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string | ApiError;
};

function getErrorMessage(payload: ApiResponse<unknown>, status: number) {
  if (!payload.error) {
    return `Request failed with status ${status}`;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  return payload.error.message;
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload.data as T;
}
