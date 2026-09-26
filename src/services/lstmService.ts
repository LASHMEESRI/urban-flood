export interface LstmPrediction {
  predicted_water_level_m: number;
  model: "LSTM";
  horizon: "next_hour";
}

export interface LstmInput {
  rainfall_sequence: number[];
  water_level_sequence: number[];
}

const LSTM_API_URL = "http://127.0.0.1:5001";

export async function predictNextWaterLevel(
  input: LstmInput,
): Promise<LstmPrediction> {
  if (input.rainfall_sequence.length !== 6) {
    throw new Error("LSTM requires 6 rainfall values");
  }

  if (input.water_level_sequence.length !== 6) {
    throw new Error("LSTM requires 6 water-level values");
  }

  const response = await fetch(`${LSTM_API_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`LSTM API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function checkLstmApi(): Promise<boolean> {
  try {
    const response = await fetch(`${LSTM_API_URL}/health`);

    return response.ok;
  } catch {
    return false;
  }
}
