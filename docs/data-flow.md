# Data Flow

## CRUD Notices

**task 1:** user click "Create Notice" -> frontend UI -> apiClient.createNotice() -> POST /api/notices -> noticesService.createNoticeFromInput() -> noticesRepository.createNotice() -> PostgreSQL

**task 2:** user view notices -> apiClient.fetchNotices() -> GET /api/notices -> noticesService.getNotices() -> noticesRepository.listNotices() -> PostgreSQL -> response

**task 3:** user update notice -> apiClient.updateNotice() -> PUT /api/notices/:id -> noticesService.updateNoticeFromInput() -> noticesRepository.updateNotice() -> PostgreSQL

**task 4:** user delete notice -> apiClient.deleteNotice() -> DELETE /api/notices/:id -> noticesService.deleteNoticeById() -> noticesRepository.deleteNotice() -> PostgreSQL

## Calendar Events

**task 5:** user view calendar -> GET /api/events -> noticesService.getNotices() -> noticesRepository.listNotices() -> transform to event format -> response

**task 6:** user create event from form -> POST /api/events -> noticesService.createNoticeFromInput() -> noticesRepository.createNotice() -> PostgreSQL

## AI Event Extraction

**task 7:** user submit text for extraction -> POST /api/events/extract-and-create -> eventExtractionService.extractEvents() -> call External LLM (OpenRouter/OpenAI/Anthropic/Google) -> parse response -> noticesService.createNoticesFromExtractedEvents() -> noticesRepository.createManyNotices() -> PostgreSQL

## Provider Models

**task 8:** user fetch available models -> POST /api/providers/models -> providerModelsService.fetchModelsForProvider() -> call provider's models API -> response

## Summary

| Task          | Flow                                                             |
| ------------- | ---------------------------------------------------------------- |
| Create Notice | UI -> API Client -> Route -> Service -> Repository -> DB         |
| Read Notices  | DB -> Repository -> Service -> Route -> API Client -> UI         |
| Update Notice | UI -> API Client -> Route -> Service -> Repository -> DB         |
| Delete Notice | UI -> API Client -> Route -> Service -> Repository -> DB         |
| View Events   | DB -> Repository -> Service -> Route -> UI                       |
| AI Extraction | UI -> Route -> Service (call LLM) -> Service -> Repository -> DB |
| Fetch Models  | UI -> Route -> Service (call provider API) -> UI                 |

## Event Shape

Notices now store a short `title` plus a `more_info` text field for optional context, notes, or links. The API surfaces this as `title` and `moreInfo` in the client-facing JSON contract.
