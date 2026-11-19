# Finovo Flutter fleet app

The Flutter app's five-step **Add Car** flow submits vehicles to the Finovo
backend. It uses the existing `/api/v1/auth/login`,
`/api/v1/vehicles/categories`, `/api/v1/vehicles/upload-images`, and
`/api/v1/vehicles` endpoints.

## Run against a backend

Set `FINOVO_API_BASE_URL` at build/run time; credentials and access/refresh
tokens are never embedded in the app or written to local storage.

```powershell
# Android emulator talking to a backend on the development machine
flutter run --dart-define=FINOVO_API_BASE_URL=http://10.0.2.2:5000/api/v1
```

For iOS simulator use `http://localhost:5000/api/v1`; for a physical device use
the development machine's LAN address. Production builds require an HTTPS URL.
The backend and database must be running and seeded with vehicle categories.

Adding a car first requires signing in with an `ADMIN`, `SUPER_ADMIN`, or
`FLEET_MANAGER` account. The access token and backend-issued session cookies are
kept in memory only; the user must sign in again after closing the app or when
the backend session expires. The server remains authoritative for role access
and field validation.

The photo endpoint accepts JSON containing base64 data URLs rather than
multipart requests. The app selects 4–6 PNG, JPG, or WEBP photos, then uploads
them immediately before vehicle creation. If creation fails after upload, the
returned photo URLs are kept for a retry so the app does not upload those same
photos again. The backend does not expose a cleanup endpoint for staged uploads;
abandoning a failed submission or a partial upload can leave unattached image
files in backend storage.

## Verify

```powershell
flutter pub get
flutter analyze
flutter test
```
