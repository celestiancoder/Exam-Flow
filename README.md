# Exam Print App

Exam Print App is an Expo and React Native application for matching examination question-paper PDFs with an Excel exam schedule and generating a room-first print queue.

## Included features

- Supabase email/password authentication
- Sleek black-and-white landing page
- Excel upload with native and web file selection
- Drag-and-drop Excel and PDF upload on web
- Multiple PDF selection
- Excel date and time normalization
- Course-code extraction from text-based PDF question papers
- Course-code matching between PDFs and Excel rows
- Room-first print queue sorting
- Adjustable spare-copy percentage
- Copy-count calculation
- Print queue refresh support
- Safe-area spacing for phones, notifications, and device cutouts

## Tech stack

- Expo SDK 58
- Expo Router
- React Native
- Supabase Authentication
- Supabase Database
- Supabase Storage
- Supabase Edge Functions
- `xlsx` for Excel parsing
- `unpdf` for server-side PDF text extraction

## Project structure

```text
src/app/
  index.tsx       Landing page
  login.tsx       Sign in and sign up
  upload.tsx      Excel/PDF upload and processing
  queue.tsx       Generated print queue

src/lib/
  supabase.ts     Supabase client
  courseCode.ts   Course-code normalization

supabase/functions/
  extract-course-codes/
    index.ts      Edge Function for PDF matching

supabase/migrations/
  *.sql           Database, storage, and permission setup
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- Expo Go or a supported Android/iOS development build

Windows PowerShell example:

```powershell
node --version
npm --version
```

## Install dependencies

From the project root:

```powershell
npm install
```

## Configure Supabase

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Use the project URL and anon/public key from Supabase:

```text
Supabase Dashboard -> Project Settings -> API
```

Do not put the Supabase service-role key in `.env` or in the React Native application.

## Create the database objects

The app expects a `public.print_jobs` table with these columns:

| Column | PostgreSQL type |
|---|---|
| `id` | `uuid` |
| `date` | `date` |
| `start_time` | `time without time zone` |
| `end_time` | `time without time zone` |
| `course_code` | `text` |
| `room` | `text` |
| `strength` | `integer` |
| `pdf_path` | `text`, nullable |
| `pdf_name` | `text`, nullable |

Use the migration in `supabase/migrations/` or run its SQL manually in:

```text
Supabase Dashboard -> SQL Editor
```

The migration also grants authenticated-table access and creates a private Storage bucket named `exam_pdfs`.

If using the Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

## Deploy the course-code Edge Function

The Edge Function extracts searchable text from PDF files with `unpdf`, compares the text against the Excel course codes, and returns matched course codes.

Deploy it with:

```powershell
npx supabase functions deploy extract-course-codes
```

Alternatively, paste the complete contents of:

```text
supabase/functions/extract-course-codes/index.ts
```

into a Supabase Studio Edge Function named `extract-course-codes`, then deploy it from Studio.

Keep **Verify JWT** enabled unless you intentionally replace it with additional authorization inside the function.

## Excel format

The first worksheet must contain these exact headers:

```text
Date
Start Time
End Time
Course Code
Room
Strength
```

Example:

| Date | Start Time | End Time | Course Code | Room | Strength |
|---|---|---|---|---|---|
| 2026-12-02 | 09:00 | 12:00 | CS301 | Room A | 45 |
| 2026-12-02 | 09:00 | 12:00 | CS302 | Room A | 40 |

Dates and times may come from Excel date/time cells or written text. Course codes are normalized by removing spaces and punctuation before matching.

## Run the app locally

Start the Expo development server:

```powershell
npx expo start --clear
```

Choose:

- `w` for Expo Web
- `a` for Android
- `i` for iOS
- Scan the QR code with Expo Go on a physical device

Web:

```powershell
npx expo start --web
```

The phone and development computer must be able to reach the Expo development server. If QR scanning cannot connect, use the tunnel option:

```powershell
npx expo start --tunnel
```

## Usage flow

1. Open or sign in to the app.
2. Open **Upload & Process**.
3. Upload one Excel schedule.
4. Select all matching text-based question-paper PDFs in one batch.
5. Set the spare-copy percentage.
6. Press **Process & Save Jobs**.
7. Open **Print Queue** to review the sorted jobs.

## Queue order

Current print-priority order:

```text
1. Rooms containing the most matched course codes
2. Room number/name
3. Exam date
4. Start time
5. Course code
```

Unmatched PDFs and unmatched Excel courses are not added to the queue.

## PDF requirement

The current implementation extracts text from searchable PDFs. Scanned-image-only PDFs require OCR and are not handled by the current Edge Function.

## Validation

```powershell
npm run lint
npx tsc --noEmit
```

Lint must pass before deployment. TypeScript may report an existing Expo Starter web-tab ref issue; it does not belong to the PDF or queue implementation.
