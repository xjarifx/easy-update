import { apiRequest } from "./http";
import type { NoticeItem, NoticeMutationInput } from "../types/domain";

export const fetchNotices = () => {
  return apiRequest<NoticeItem[]>("/api/notices", {
    cache: "no-store",
  });
};

export const createNotice = (notice: NoticeMutationInput) => {
  return apiRequest<NoticeItem>("/api/notices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notice),
  });
};

export const updateNotice = (id: number, notice: NoticeMutationInput) => {
  return apiRequest<NoticeItem>(`/api/notices/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notice),
  });
};

export const deleteNotice = (id: number) => {
  return apiRequest<NoticeItem>(`/api/notices/${id}`, {
    method: "DELETE",
  });
};
