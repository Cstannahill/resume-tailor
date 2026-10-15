# What the studio shows when a call fails

`apiRequest` is the only HTTP client. React Query defaults live in `AppProviders`. The copy on a few cards does not match those clients.

## 401 is rewritten before the form

On status 401, `apiRequest` throws `Error("Unauthorized")` and sets `error.code = 401`. It does not read `error.message` from the body.

`POST /auth/login` answers bad passwords with `Invalid credentials`. The sign-in handler puts `(error).message` on the email field, so the visible text is **Unauthorized**. Register failures are 400, so the email field shows the server message (`Email already registered` or `Validation failed`). Zod `details` never arrive. A 401 from any other panel (`toast.error(error.message)`) is the same `Unauthorized` string.

`loadProfile` clears the stored token only when `GET /auth/me` throws. Other 401s leave `experience:auth-token` and `experience:auth-user` in place. Cached user JSON skips `/auth/me` until `refreshProfile()`, and nothing in the UI calls `refreshProfile`.

## Model catalog Retry

`LlmModelCatalog` types `GET /llm/models` as `LlmModelMetadata[]`. The payload is a `ProviderModelCatalog` or an array of them (`provider`, `models`, `cachedUntil`, and on failure `status` plus `message`).

| Request | `json.data` | What the card does |
| --- | --- | --- |
| All providers | Array of catalogs | `Array.isArray` is true. Each catalog is grouped by `provider`. `name` and `description` are missing, so the title is blank. `status` and `message` are not read. |
| One provider | One catalog object | Not an array. The panel says **No models returned**, including when `status` is `error`. |

The API keeps that body, including errors, for 10 minutes and ignores refetch. The Retry button calls `query.refetch()`, which does hit the network, and then renders the same cached catalog. Query defaults add another delay: `staleTime` 60 seconds, `refetchOnWindowFocus: false`, query `retry: 1`, mutation `retry: 0`. Switching away from a provider and back inside 60 seconds does not refetch. A failed mutation does not retry.

`ModelCard` reads `model.free` and prints `model.pricing` as a React child. Catalog entries use `isFree` and a `pricing` object. Mapping an entry straight into `ModelCard` would not show the Free badge, and rendering the pricing object throws.

`listOllamaTags` types the body as an array. `GET /llm/ollama/tags` returns `{ models: [...] }`. The helper is unused.

## Provider keys after save

The settings card says the last four characters display after saving, and that keys are decrypted at request time. `GET /settings/provider-keys` returns `provider`, timestamps, `metadata`, and `configured: true`. It does not return `lastFour` or the ciphertext.

`SettingsPanel` keeps the last four in `lastFourCache` for the current page lifetime. After a reload the line reads `ending in ????`. Nothing decrypts the stored key on a generation request.

Remove calls `DELETE` and ignores the return value. A 204 with no JSON body becomes `""` inside `apiRequest` (non-JSON success returns `response.text()`). Deleting a provider that is already gone is a 500, and the toast says **Internal Server Error**.

The default-provider control sends `defaultProvider`. The notifications checkboxes send `notifications`. Those keys are not on the settings schema, so a successful toast can still persist nulls for `defaultLlmProvider` and `notificationPrefs`. Generation continues to use `DEFAULT_LLM_PROVIDER` and the process env key for the selected adapter.
