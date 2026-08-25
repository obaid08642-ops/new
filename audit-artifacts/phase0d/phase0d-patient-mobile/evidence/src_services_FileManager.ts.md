# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/FileManager.ts`
- **Member SHA-256:** `1c082aaea233145dac7533a42c76c6a1d3afb1fe575e2f2aea843c11380565f5`
- **Line count:** 134
- **Read range:** `1-134`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: export interface DownloadOptions {`
- `11: export interface UploadOptions {`
- `14: uploadType?: any;`
- `42: * Downloads a file and optionally caches it`
- `44: public async downloadFile(url: string, filename: string, options?: DownloadOptions): Promise<string | null> {`
- `56: const result = await FileSystem.downloadAsync(url, dest, { headers: options?.headers });`
- `58: log.info('File downloaded successfully', { url, dest });`
- `61: log.error('Download failed with status', { status: result.status });`
- `64: log.error('Failed to download file', e);`
- `70: * Uploads a file using multipart or binary`
- `72: public async uploadFile(url: string, fileUri: string, options?: UploadOptions): Promise<any> {`
- `74: const result = await FileSystem.uploadAsync(url, fileUri, {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `57: if (result.status >= 200 && result.status < 300) {`
- `58: log.info('File downloaded successfully', { url, dest });`
- `61: log.error('Download failed with status', { status: result.status });`
- `64: log.error('Failed to download file', e);`
- `83: if (result.status >= 200 && result.status < 300) {`
- `84: log.info('File uploaded successfully', { url });`
- `87: log.error('Upload failed with status', { status: result.status });`
- `88: throw new Error(`Upload failed: ${result.status}`);`
- `90: log.error('Failed to upload file', e);`
- `105: log.info('Cache cleared successfully');`
- `107: log.error('Failed to clear cache', e);`
- `128: log.error('Failed to get cache size', e);`
### payment_insurance_relevance
- `112: * Gets total size of cached files in bytes`
- `117: let total = 0;`
- `123: total += info.size;`
- `126: return total;`
### error_empty_loading_retry_cancel
- `61: log.error('Download failed with status', { status: result.status });`
- `63: } catch (e) {`
- `64: log.error('Failed to download file', e);`
- `87: log.error('Upload failed with status', { status: result.status });`
- `88: throw new Error(`Upload failed: ${result.status}`);`
- `89: } catch (e) {`
- `90: log.error('Failed to upload file', e);`
- `106: } catch (e) {`
- `107: log.error('Failed to clear cache', e);`
- `127: } catch (e) {`
- `128: log.error('Failed to get cache size', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
