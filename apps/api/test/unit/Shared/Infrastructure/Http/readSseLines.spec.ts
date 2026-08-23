import { readSseLines } from '../../../../../src/Shared/Infrastructure/Http/readSseLines';

const streamFrom = (chunks: readonly string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();

        return;
      }

      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  });
};

const collect = async (
  stream: ReadableStream<Uint8Array>,
): Promise<string[]> => {
  const payloads: string[] = [];
  for await (const payload of readSseLines(stream)) {
    payloads.push(payload);
  }

  return payloads;
};

describe('readSseLines', () => {
  it('yields one payload per data: line', async () => {
    const payloads = await collect(
      streamFrom(['data: {"a":1}\n\ndata: {"a":2}\n\n']),
    );

    expect(payloads).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('buffers a payload split across two chunk boundaries', async () => {
    const payloads = await collect(streamFrom(['data: {"a":1', '23}\n\n']));

    expect(payloads).toEqual(['{"a":123}']);
  });

  it('buffers a split across the "data:" prefix itself', async () => {
    const payloads = await collect(streamFrom(['da', 'ta: {"a":1}\n\n']));

    expect(payloads).toEqual(['{"a":1}']);
  });

  it('skips blank lines and comment lines', async () => {
    const payloads = await collect(
      streamFrom([': keep-alive\n\ndata: {"a":1}\n\n\n']),
    );

    expect(payloads).toEqual(['{"a":1}']);
  });

  it('stops cleanly at stream end with no trailing newline', async () => {
    const payloads = await collect(streamFrom(['data: {"a":1}\n']));

    expect(payloads).toEqual(['{"a":1}']);
  });

  it('yields nothing for an empty stream', async () => {
    expect(await collect(streamFrom([]))).toEqual([]);
  });
});
