export interface LstmSequenceRecord {
  sequence_id: number;
  input_start: string;
  input_end: string;
  target_timestamp: string;
  rainfall_sequence: string;
  water_level_sequence: string;
  target_water_level: number;
}

export async function loadLstmSequences(): Promise<LstmSequenceRecord[]> {
  const response = await fetch("/chennai_lstm_sequences.json");

  if (!response.ok) {
    throw new Error("Failed to load offline Chennai LSTM sequences");
  }

  return response.json();
}

function parseSequence(value: string): number[] {
  return value
    .split("|")
    .map(Number)
    .filter((item) => Number.isFinite(item));
}

export function prepareLstmInput(record: LstmSequenceRecord): {
  rainfall_sequence: number[];
  water_level_sequence: number[];
} {
  const rainfall_sequence = parseSequence(record.rainfall_sequence);
  const water_level_sequence = parseSequence(record.water_level_sequence);

  if (rainfall_sequence.length !== 6) {
    throw new Error(
      `Sequence ${record.sequence_id} has ${rainfall_sequence.length} rainfall values; expected 6`,
    );
  }

  if (water_level_sequence.length !== 6) {
    throw new Error(
      `Sequence ${record.sequence_id} has ${water_level_sequence.length} water-level values; expected 6`,
    );
  }

  return {
    rainfall_sequence,
    water_level_sequence,
  };
}
