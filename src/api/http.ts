type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(
      payload.error ?? `Request failed with status ${response.status}`,
    );
  }

  return payload.data as T;
}
