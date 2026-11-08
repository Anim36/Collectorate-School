const fileKey = process.argv[2] ?? "nNXhYLlQGcfOs0wklQJ15E";

const attempts = [
  { url: `https://api.figma.com/v1/files/${fileKey}?depth=1`, headers: {} },
  {
    url: `https://api.figma.com/v1/files/${fileKey}/nodes?ids=2:640`,
    headers: {},
  },
  {
    url: `https://www.figma.com/file/${fileKey}/Untitled`,
    headers: { "User-Agent": "Mozilla/5.0" },
  },
];

for (const attempt of attempts) {
  try {
    const res = await fetch(attempt.url, { headers: attempt.headers });
    const body = await res.text();
    console.log(`\n=== ${attempt.url}\nstatus ${res.status}\n${body.slice(0, 700)}`);
  } catch (error) {
    console.log(`\n=== ${attempt.url}\nFAILED: ${error.message}`);
  }
}
