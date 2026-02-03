export const runtime = "nodejs";

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export async function GET(request: Request) {
  const { signal } = request;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Initial payload
      send("pulse", {
        latency: 128,
        throughput: 940,
        errors: 0.4,
        confidence: 87,
        ts: Date.now(),
      });

      const id = setInterval(() => {
        send("pulse", {
          latency: randomBetween(110, 180),
          throughput: randomBetween(880, 1040),
          errors: Number((Math.random() * 0.8).toFixed(2)),
          confidence: randomBetween(80, 99),
          ts: Date.now(),
        });
      }, 2000);

      signal.addEventListener(
        "abort",
        () => {
          clearInterval(id);
          controller.close();
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
