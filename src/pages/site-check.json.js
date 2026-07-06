export const prerender = false;

export async function GET() {
  return new Response(
    JSON.stringify({
      site: 'skystates.us',
      project: 'sky_states',
      status: 'live',
      updated: '2026-07-06',
      revision: '20260706v2',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
}
