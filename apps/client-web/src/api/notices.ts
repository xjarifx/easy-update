import { apiRequest } from "./http";
import type { NoticeItem, NoticeMutationInput } from "@easy-update/types";

export const fetchNotices = (token: string | null | undefined) => {
  return apiRequest<NoticeItem[]>("/api/notices", {
    cache: "no-store",
    token,
  });
};

export const createNotice = (notice: NoticeMutationInput, token: string | null | undefined) => {
  return apiRequest<NoticeItem>("/api/notices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notice),
    token,
  });
};

export const updateNotice = (id: number, notice: NoticeMutationInput, token: string | null | undefined) => {
  return apiRequest<NoticeItem>(`/api/notices/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notice),
    token,
  });
};

export const deleteNotice = (id: number, token: string | null | undefined) => {
  return apiRequest<NoticeItem>(`/api/notices/${id}`, {
    method: "DELETE",
    token,
  });
};
