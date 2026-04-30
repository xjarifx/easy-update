# Data Architecture

## Data Flow Rules

- **Writes:** frontend → API → database
- **Reads:** database → API → frontend

The frontend never talks directly to the database. All data passes through the Express API layer.

## CRUD Notices

**Create:** UI click "Create Notice" → `apiClient.createNotice()` → `POST /api/notices` → `noticesService.createNoticeFromInput()` → `noticesRepository.createNotice()` → PostgreSQL

**Read:** UI view notices → `apiClient.fetchNotices()` → `GET /api/notices` → `noticesService.getNotices()` → `noticesRepository.listNotices()` → PostgreSQL → response

**Update:** UI update notice → `apiClient.updateNotice()` → `PUT /api/notices/:id` → `noticesService.updateNoticeFromInput()` → `noticesRepository.updateNotice()` → PostgreSQL

**Delete:** UI delete notice → `apiClient.deleteNotice()` → `DELETE /api/notices/:id` → `noticesService.deleteNoticeById()` → `noticesRepository.deleteNotice()` → PostgreSQL

## Calendar Events

**View:** UI view calendar → `GET /api/events` → `noticesService.getNotices()` → `noticesRepository.listNotices()` → transform to event format → response

**Create:** UI create event from form → `POST /api/events` → `noticesService.createNoticeFromInput()` → `noticesRepository.createNotice()` → PostgreSQL

## AI Event Extraction

UI submit text → `POST /api/events/extract-and-create` → `eventExtractionService.extractEvents()` → call external LLM (OpenRouter/OpenAI/Anthropic/Google) → parse response → `noticesService.createNoticesFromExtractedEvents()` → `noticesRepository.createManyNotices()` → PostgreSQL

## Provider Models

UI fetch available models → `POST /api/providers/models` → `providerModelsService.fetchModelsForProvider()` → call provider's models API → response

## Summary

| Flow          | Direction                                                        |
| ------------- | ---------------------------------------------------------------- |
| Create Notice | UI → API Client → Route → Service → Repository → DB              |
| Read Notices  | DB → Repository → Service → Route → API Client → UI              |
| Update Notice | UI → API Client → Route → Service → Repository → DB              |
| Delete Notice | UI → API Client → Route → Service → Repository → DB              |
| View Events   | DB → Repository → Service → Route → UI                           |
| AI Extraction | UI → Route → Service (call LLM) → Service → Repository → DB      |
| Fetch Models  | UI → Route → Service (call provider API) → UI                    |

## Event Shape

Notices store a short `title` plus a `more_info` text field for optional context, notes, or links. The API surfaces this as `title` and `moreInfo` in the client-facing JSON contract.
