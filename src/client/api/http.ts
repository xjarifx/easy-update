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

  // Handle 204 No Content and other empty responses
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload.data as T;
}
