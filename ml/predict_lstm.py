import sys
import json
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler

MODEL_FILE = "ml/models/urban_flood_lstm.keras"
DATA_FILE = "data/processed/lstm_clean_sequences.csv"


def load_training_scalers():
    import pandas as pd

    df = pd.read_csv(DATA_FILE)

    def parse_sequence(value):
        return [float(x) for x in str(value).split("|")]

    rainfall = np.array(
        [parse_sequence(x) for x in df["rainfall_sequence"]],
        dtype=np.float32
    )

    water_level = np.array(
        [parse_sequence(x) for x in df["water_level_sequence"]],
        dtype=np.float32
    )

    X = np.stack(
        [rainfall, water_level],
        axis=-1
    )

    y = (
        df["target_water_level"]
        .astype(np.float32)
        .to_numpy()
        .reshape(-1, 1)
    )

    # Same chronological training split used during model training
    X_train = X[:55]
    y_train = y[:55]

    feature_scaler = StandardScaler()
    feature_scaler.fit(
        X_train.reshape(-1, 2)
    )

    target_scaler = StandardScaler()
    target_scaler.fit(y_train)

    return feature_scaler, target_scaler


def predict(rainfall_sequence, water_level_sequence):

    if len(rainfall_sequence) != 6:
        raise ValueError(
            "Rainfall sequence must contain exactly 6 values"
        )

    if len(water_level_sequence) != 6:
        raise ValueError(
            "Water-level sequence must contain exactly 6 values"
        )

    # Load trained LSTM model
    model = tf.keras.models.load_model(MODEL_FILE)

    # Load the same scalers used during training
    feature_scaler, target_scaler = load_training_scalers()

    # Create input:
    # 6 time steps × 2 features
    X = np.stack(
        [
            rainfall_sequence,
            water_level_sequence
        ],
        axis=-1
    ).astype(np.float32)

    # Shape:
    # (1, 6, 2)
    X = X.reshape(1, 6, 2)

    # Scale input features
    X_scaled = feature_scaler.transform(
        X.reshape(-1, 2)
    ).reshape(1, 6, 2)

    # LSTM prediction
    prediction_scaled = model.predict(
        X_scaled,
        verbose=0
    )

    # Convert prediction back to metres
    prediction = target_scaler.inverse_transform(
        prediction_scaled
    )[0][0]

    return float(prediction)


if __name__ == "__main__":

    if len(sys.argv) != 3:
        print(
            json.dumps({
                "error": "Usage: python ml/predict_lstm.py "
                         "\"[rainfall values]\" "
                         "\"[water level values]\""
            })
        )
        sys.exit(1)

    try:

        rainfall = json.loads(sys.argv[1])
        water_level = json.loads(sys.argv[2])

        result = predict(
            rainfall,
            water_level
        )

        print(
            json.dumps({
                "predicted_water_level_m": round(result, 4),
                "model": "LSTM",
                "horizon": "next_hour"
            })
        )

    except Exception as error:

        print(
            json.dumps({
                "error": str(error)
            })
        )

        sys.exit(1)