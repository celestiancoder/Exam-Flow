// @ts-ignore: Supabase's Deno runtime resolves npm: imports.
import { createClient } from 'npm:@supabase/supabase-js@2';
// @ts-ignore: Supabase's Deno runtime resolves npm: imports.
import { extractText, getDocumentProxy } from 'npm:unpdf@2.2.2';

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
  env: {
    get: (name: string) => string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function extractCandidates(text: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /\b[A-Z]{2,8}[\s._/-]*[A-Z]?[0-9][0-9A-Z./_-]*\b/gi,
    /\b[0-9]{2,4}[A-Z]{2,8}[0-9]{2,5}\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const candidate = normalize(match[0]);
      if (candidate.length >= 5) candidates.add(candidate);
    }
  }

  return [...candidates];
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  return typeof result.text === 'string'
    ? result.text
    : result.text.join('\n');
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await request.json() as {
      storagePaths?: unknown;
      courseCodes?: unknown;
    };
    const storagePaths = Array.isArray(body.storagePaths)
      ? body.storagePaths.map((path: unknown) => String(path)).filter(Boolean)
      : [];
    const courseCodes = Array.isArray(body.courseCodes)
      ? body.courseCodes.map((courseCode: unknown) => String(courseCode).trim()).filter(Boolean)
      : [];

    if (!storagePaths.length) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const matches = [];
    for (const storagePath of storagePaths) {
      const { data, error } = await supabase.storage
        .from('exam_pdfs')
        .download(storagePath);
      if (error || !data) throw error ?? new Error(`Could not download ${storagePath}`);

      const text = await extractPdfText(await data.arrayBuffer());
      const normalizedText = normalize(text);
      const matchedCodes = courseCodes.filter((courseCode) => {
        const normalizedCourseCode = normalize(courseCode);
        return normalizedCourseCode.length >= 3 && normalizedText.includes(normalizedCourseCode);
      });

      matches.push({
        storagePath,
        courseCodes: matchedCodes,
        candidates: extractCandidates(text),
      });
    }

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'PDF matching failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
